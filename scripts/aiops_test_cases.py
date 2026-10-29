"""테스트 입력·수동 평가표·메일 레이아웃 예시만 생성합니다. AWS/AI를 호출하지 않습니다."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from types import SimpleNamespace

from aiops_mock_event import SCENARIOS, generate

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenarios', nargs='+', choices=SCENARIOS,
                        default=['rds', 'environment', 'timeout', 'http500'])
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists() and any(output.iterdir()):
        parser.error('출력 폴더가 비어 있지 않습니다. 새 폴더를 지정하세요.')
    output.mkdir(parents=True, exist_ok=True)
    # 알림 렌더러는 SDK를 생성하지 않습니다. 실제 AI 호출 없이 plain-text 레이아웃을 확인합니다.
    sys.path.insert(0, str(ROOT / 'lambda/aiops'))
    from event_parser import parse_event
    from error_classifier import classify
    from sns_notifier import notification

    report = ['# AIOps 수동 분석 평가', '',
              '모든 실제 AI 결과는 미검증입니다. 이 파일은 기대값과 기록 양식이며 자동 평가 결과가 아닙니다.', '',
              '| 사례 | 기대 분류 | AI 상태 | 원인·근거 적절성 | 실제 이메일 수신 |',
              '| --- | --- | --- | --- | --- |']
    manifest = []
    for name in dict.fromkeys(args.scenarios):
        case = SCENARIOS[name]
        event = generate(name)
        (output / (name + '.json')).write_text(json.dumps(event, ensure_ascii=False, indent=2))
        incident = parse_event(event, SimpleNamespace(service='daily-briefing'))[0]
        classification = classify(incident)
        assert classification.kind == case['expected']
        report.append(f"| {name} · {case['title']} | {case['expected']} | 미검증 | 미검증 | 미검증 |")
        manifest.append({'scenario': name, **case, 'actual_ai_result': '미검증'})
    report += ['', '## 사례별 확인 기준', '']
    for name in dict.fromkeys(args.scenarios):
        report += ['### ' + name + ' · ' + SCENARIOS[name]['title'], '',
                   '합성 로그: `' + SCENARIOS[name]['message'] + '`', '']
        report += ['- [ ] ' + check for check in SCENARIOS[name]['checks']]
        report += ['- [ ] 추정과 관측 사실을 구분한다.', '- [ ] 실제 존재를 확인하지 않은 리소스 식별자나 비밀값을 만들어내지 않는다.', '']
    (output / 'REPORT.md').write_text('\n'.join(report) + '\n')
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    # 합성 분석 예시임을 명시합니다. 메일 문구와 AI 품질의 검증을 혼동하지 않습니다.
    sample = SimpleNamespace(
        analysis={
            'error_type': 'DB 연결을 시작하지 못했습니다. 추가 확인이 필요합니다.',
            'probable_causes': [{'cause': 'DB 접속 대상 또는 연결 상태 문제 가능성', 'reason': 'JDBCConnectionException이 기록되어 있습니다.'}],
            'resources_to_check': ['RDS 상태', 'ECS 실행 설정과 DB 연결 경로'],
            'recommended_actions': ['RDS 콘솔에서 DB 상태가 available인지 확인하세요.', 'ECS의 DB endpoint 설정을 확인하고 보안 그룹의 연결 허용 범위를 점검하세요.'],
            'additional_checks': ['이 로그만으로 정확한 원인을 확정할 수 없습니다.'],
        }, reason='SUCCESS',
    )
    incident = parse_event(generate('rds'), SimpleNamespace(service='daily-briefing'))[0]
    mail = notification(incident, classify(incident), sample)
    (output / 'email-preview.txt').write_text('레이아웃 확인용 합성 예시 · 실제 AI 응답/실제 발송 결과 아님\n\n제목: ' + mail['subject'] + '\n\n' + mail['message'] + '\n')
    (output / 'README.md').write_text(
        '# 테스트 파일 사용법\n\n'
        '생성 시각(UTC): ' + datetime.now(timezone.utc).isoformat() + '\n\n'
        '이 도구는 JSON과 평가표만 생성하며 AWS·AI·이메일을 호출하지 않습니다.\n'
        '먼저 수정한 Lambda ZIP을 배포하세요. 하루 AI 한도가 1이면 여러 사례 중 나머지는 기본 알림이 됩니다.\n'
        '기본 4사례 검증에는 일일 한도 여유가 최소 4회 필요합니다. 오늘 이미 사용한 횟수도 포함하세요.\n'
        '사례별 JSON을 한 건씩 수동 invoke하고 REPORT.md에 실제 결과를 기록하세요. 단일 분에 몰아 보내지 마세요.\n'
        '동일 JSON 파일 재전송은 중복으로 생략됩니다. 새 발생을 시험하려면 새 폴더에 다시 생성하세요.\n'
        'email-preview.txt는 하드코딩된 합성 분석으로 만든 레이아웃 예시이며 실제 모델 성능의 증거가 아닙니다.\n'
    )
    print(f'로컬 파일 생성 완료: {output} ({len(manifest)}개 사례, AWS/AI 호출 없음)')


if __name__ == '__main__':
    main()
