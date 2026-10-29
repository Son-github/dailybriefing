"""README용 편집 가능한 SVG 생성. 네트워크/AWS 접근 없이 저장된 공식 아이콘만 사용합니다."""
from html import escape
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs/assets/architecture"
INK, MUTED, BLUE, GREEN, PURPLE = "#152b45", "#60738b", "#3478c7", "#348354", "#7653ad"


class Diagram:
    def __init__(self, width, height, title, subtitle):
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
                      f'<title id="title">{escape(title)}</title><desc id="desc">{escape(subtitle)}</desc>',
                      '<defs><marker id="arrow-blue" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#3478c7"/></marker><marker id="arrow-green" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#348354"/></marker><marker id="arrow-purple" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#7653ad"/></marker></defs>',
                      f'<rect width="{width}" height="{height}" fill="#fff"/>',
                      '<style>text{font-family:"Apple SD Gothic Neo","Noto Sans CJK KR",Arial,sans-serif} .label{paint-order:stroke;stroke:#fff;stroke-width:7px;stroke-linejoin:round}</style>']
        self.text(42, 48, title, 30, weight=700)
        self.text(42, 80, subtitle, 17, MUTED)
        for path in sorted((ASSETS / "icons").glob("*.svg")):
            source = path.read_text()
            view = ET.fromstring(source).attrib.get("viewBox", "0 0 64 64")
            inner = re.sub(r'^.*?<svg\b[^>]*>', '', source, count=1, flags=re.S)
            inner = re.sub(r'</svg>\s*$', '', inner)
            for ident in set(re.findall(r'\bid="([^"]+)"', inner)):
                inner = inner.replace(f'id="{ident}"', f'id="{path.stem}-{ident}"').replace(f'#{ident})', f'#{path.stem}-{ident})')
            self.parts.append(f'<defs><symbol id="icon-{path.stem}" viewBox="{view}">{inner}</symbol></defs>')

    def text(self, x, y, value, size=19, color=INK, weight=400, anchor="start", label=False):
        self.parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}"'+(' class="label"' if label else '')+f'>{escape(value)}</text>')

    def rect(self, x, y, w, h, fill="#fff", stroke="#d4dde7", dash=False, radius=12, width=1.5):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"'+(' stroke-dasharray="7 6"' if dash else '')+'/>')

    def boundary(self, x, y, w, h, title, color, fill="#fff", dash=False):
        self.rect(x,y,w,h,fill,color,dash,16,2)
        self.text(x+18,y+30,title,19,color,700)

    def icon(self, name, x, y, size=48):
        self.parts.append(f'<use href="#icon-{name}" xlink:href="#icon-{name}" x="{x}" y="{y}" width="{size}" height="{size}"/>')

    def card(self, x, y, w, h, title, detail="", icon=None, color=BLUE, fill="#fff", dash=False):
        self.rect(x,y,w,h,fill,"#b7c8da" if not dash else "#b5c3d3",dash)
        if icon:
            self.icon(icon,x+15,y+(h-48)/2)
        tx=x+(78 if icon else 18)
        self.text(tx,y+h/2-2,title,20,color,700)
        if detail:
            self.text(tx,y+h/2+23,detail,15,MUTED)

    def line(self, path, color="blue", dash=False):
        colors={"blue":BLUE,"green":GREEN,"purple":PURPLE}
        self.parts.append(f'<path d="{path}" fill="none" stroke="{colors[color]}" stroke-width="2.4" stroke-linejoin="round" marker-end="url(#arrow-{color})"'+(' stroke-dasharray="7 5"' if dash else '')+'/>')

    def save(self, name):
        (ASSETS / f"{name}.svg").write_text("\n".join(self.parts)+"\n</svg>\n")


def cloud():
    d=Diagram(1800,1160,"Daily Briefing | 클라우드 아키텍처", "서울 리전 · ECS 작업 1개 · 단일 가용 영역 DB · 가비아 DNS 사용")
    d.boundary(250,120,1505,925,"AWS 클라우드",INK,"#fcfdff")
    d.boundary(570,158,1145,865,"아시아 태평양(서울) · ap-northeast-2",BLUE,"#f8fbff",True)
    d.boundary(600,325,1085,530,"Amazon VPC · 10.20.0.0/16",PURPLE)
    d.boundary(625,382,500,450,"가용 영역 A · ap-northeast-2a",MUTED,"#fff",True)
    d.boundary(1145,382,515,450,"가용 영역 C · ap-northeast-2c",MUTED,"#fff",True)
    for x,w,public,app,db in [(640,470,"10.20.1.0/24","10.20.11.0/24","10.20.21.0/24"),(1160,485,"10.20.2.0/24","10.20.12.0/24","10.20.22.0/24")]:
        for y,h,label,cidr,fill,color in [(430,130,"퍼블릭 서브넷",public,"#f1f9ef",GREEN),(580,110,"앱 전용 프라이빗 서브넷",app,"#edf5fe",BLUE),(710,105,"DB 전용 프라이빗 서브넷",db,"#f3f2fc",PURPLE)]:
            d.rect(x,y,w,h,fill,"#d8e2eb",False,8)
            d.text(x+12,y+22,f"{label} · {cidr}",15,color,700)
    # 요청/아웃바운드 선은 노드 아래에 배치하여 라벨과 겹치지 않게 합니다.
    d.line("M210 357 H300")
    d.text(215,340,"HTTPS",14,BLUE,label=True)
    d.line("M510 330 H548 V250 H600")
    d.text(550,307,"정적 파일 · OAC",14,BLUE,label=True)
    d.line("M510 377 H555 V368 H1135 V446 H1050 V458")
    d.text(300,460,"/api/* → ALB",17,BLUE)
    d.text(300,486,"HTTPS · 캐시 제외",15,MUTED)
    d.line("M1050 545 H1060 V645 H1020")
    d.text(1035,569,"HTTP :8080",14,BLUE,label=True)
    d.line("M850 675 V701 H1085 V780 H1020")
    d.text(865,704,"TLS :5432",14,BLUE,label=True)
    d.line("M660 645 H645 V568 H710 V546", "green")
    d.line("M650 509 H610", "green")
    d.line("M575 509 H270 V745 H220", "green")
    d.text(280,531,"NAT를 통한 외부 HTTPS 통신",15,GREEN,label=True)
    d.line("M1020 650 H1135 V903 H875 V970 H900", "purple",True)
    d.text(1078,918,"로그 · 지표",15,PURPLE,label=True)
    d.line("M130 250 V302","purple",True)
    d.line("M130 415 V490","green",True)
    # Edge/서비스 노드
    d.card(40,150,180,100,"가비아 DNS","CNAME 레코드 관리",color=PURPLE)
    d.card(40,302,170,113,"사용자","웹 · 모바일",color=INK)
    d.card(40,490,180,100,"카카오 지도 SDK","브라우저 → CDN",color=GREEN)
    d.card(40,685,180,135,"외부 API","기상청 / 네이버",color=GREEN)
    d.text(58,794,"카카오 / 수출입은행 / KASI",14,MUTED)
    d.text(300,208,"글로벌 엣지",15,MUTED,700)
    d.card(300,300,210,115,"CloudFront","www 도메인", "cloudfront",PURPLE)
    d.card(300,555,235,105,"ACM · HTTPS","us-east-1", "acm",PURPLE)
    d.text(300,685,"SPA 라우팅 · OAC",17,MUTED)
    d.text(300,716,"CSP / HSTS 헤더",17,MUTED)
    d.text(300,747,"호스트 전용 인증 쿠키",17,MUTED)
    d.card(600,210,250,83,"비공개 S3","React · 실행 설정","s3",GREEN)
    d.card(870,210,230,83,"Amazon ECR","이미지 다이제스트 고정","ecr",BLUE)
    d.card(1120,210,275,83,"SSM / Secrets","API 키 · DB 접속 정보","secrets",PURPLE)
    d.card(1415,210,270,83,"ACM · API TLS","ap-northeast-2","acm",PURPLE)
    d.card(650,476,165,70,"NAT","1개 운영","nat",GREEN)
    d.icon("igw",576,486,44)
    d.text(574,564,"IGW",14,GREEN,700)
    d.card(850,458,400,87,"애플리케이션 로드 밸런서","두 가용 영역의 퍼블릭 서브넷 배치","alb",PURPLE)
    d.card(660,612,360,63,"ECS Fargate","Spring Boot · 작업 1개 · 공인 IP 없음","fargate",BLUE)
    d.card(660,748,360,63,"RDS PostgreSQL 17","db.t4g.micro · 단일 가용 영역","rds",PURPLE)
    d.card(1180,612,445,63,"앱 확장용 서브넷","서브넷 확보 · 실행 중인 작업 없음",color=MUTED,fill="#f9fbfd",dash=True)
    d.card(1180,748,445,63,"DB 서브넷 그룹 구성","이 가용 영역에는 대기 DB 없음",color=MUTED,fill="#f9fbfd",dash=True)
    d.card(600,930,270,80,"Terraform 상태","별도 bootstrap S3에 보관","s3",GREEN)
    d.card(900,930,325,80,"CloudWatch","로그 · 요청 ID · 알람","cloudwatch",PURPLE)
    d.card(1250,930,435,80,"시연용 중단 · 복원","최종 스냅샷 → 복원 → LIVE 전환","rds",PURPLE)
    d.text(42,1091,"요청 흐름",15,BLUE,700)
    d.text(220,1091,"사용자 → CloudFront → S3 또는 ALB → 프라이빗 Fargate → 프라이빗 RDS",18)
    d.text(42,1126,"접근 제어",15,PURPLE,700)
    d.text(220,1126,"ALB 443: CloudFront 주소 목록만 허용 · ECS 8080: ALB 보안 그룹만 허용 · DB 5432: ECS 보안 그룹만 허용",17)
    d.save("cloud-architecture")


def delivery():
    d=Diagram(1800,675,"Daily Briefing | 배포 및 인프라 관리", "GitHub OIDC 기반 애플리케이션 배포 · 인프라 변경은 운영자가 검토 후 적용")
    d.boundary(385,130,470,330,"GitHub Actions",MUTED,"#f8fafc")
    d.boundary(920,130,830,330,"AWS · 배포 대상",INK,"#fcfdff")
    d.line("M205 266 H350 V215 H410")
    d.line("M615 215 H660")
    d.line("M830 215 H950","purple")
    d.text(858,194,"OIDC",15,PURPLE,label=True)
    d.line("M1155 215 H1200")
    d.line("M1420 215 H1480")
    d.line("M855 375 H1200")
    d.text(975,361,"프런트엔드 빌드",15,BLUE,label=True)
    d.line("M1420 375 H1480")
    d.card(40,215,165,100,"GitHub","main 변경 · 수동 실행",color=INK)
    d.card(410,175,205,80,"검증","단위 · 통합 테스트",color=BLUE)
    d.card(660,175,170,80,"빌드","Docker / Vite",color=BLUE)
    d.card(410,335,420,80,"애플리케이션 배포","이미지 업로드 → ECS 배포 → API 확인",color=BLUE)
    d.card(950,175,205,80,"IAM 역할","임시 자격증명","iam",PURPLE)
    d.card(1200,175,220,80,"Amazon ECR","실행별 고유 태그","ecr",BLUE)
    d.card(1480,175,240,80,"ECS Fargate","개정 관리 · 롤백","fargate",BLUE)
    d.card(1200,335,220,80,"비공개 S3","정적 자산 → HTML","s3",GREEN)
    d.card(1480,335,240,80,"CloudFront","정적 파일 · API","cloudfront",PURPLE)
    d.text(410,294,"장기 AWS 액세스 키 미사용",17,MUTED)
    d.boundary(385,495,1365,130,"운영자 수동 인프라 관리",GREEN,"#f5faf6")
    d.card(410,540,245,62,"Terraform","계획 → 검토 → 적용",color=GREEN)
    d.line("M655 571 H745","green")
    d.card(745,540,290,62,"S3 상태 저장","잠금 파일 · 버전 관리","s3",GREEN)
    d.line("M1035 571 H1130","green")
    d.card(1130,540,580,62,"VPC / ALB / ECS / RDS / ACM","수동 적용 · 실행 설정은 Actions에서 관리",color=GREEN)
    d.text(42,651,"실행 설정 전환: API 확인 → LIVE / STATIC_DEMO · 이미지 업로드 및 ECS 재배포 없음",17,MUTED)
    d.save("delivery-architecture")


def aiops():
    d=Diagram(1800,780,"Daily Briefing | 장애 분석 및 알림", "구축 완료를 전제로 한 구성 · 오류 수집 → 분류 → AI 분석 → 이메일 알림")
    d.boundary(40,125,1710,565,"AIOps · 오류 분석 및 알림 처리 영역",PURPLE,"#fcfaff",True)
    d.line("M355 235 H410 V300 H470","purple")
    d.line("M355 430 H410 V335 H470","purple")
    d.line("M800 280 H855 V220 H900","purple")
    d.line("M800 325 H860 V455 H1240","purple")
    d.text(890,442,"규칙 기반 기본 알림",15,PURPLE,label=True)
    d.line("M800 305 H835 V285 H1210 V220 H1240","purple",True)
    d.text(945,282,"민감정보 제거 로그",14,PURPLE,label=True)
    d.line("M1480 220 H1510 V365 H820 V420 H730 V380","purple",True)
    d.text(1120,353,"분석 결과 · 실패 시 기본 알림",15,PURPLE,label=True)
    d.line("M1480 455 H1540","purple")
    d.line("M800 350 H850 V550 H900", "purple")
    d.line("M900 570 H840 V410 H780 V380", "purple", True)
    d.card(70,190,285,90,"CloudWatch Logs","백엔드 오류 로그","cloudwatch",PURPLE)
    d.card(70,385,285,90,"EventBridge","ECS 작업 중단 · 배포 실패","eventbridge",PURPLE)
    d.card(470,235,330,145,"Python Lambda","파싱 → 민감정보 제거 → 분류","lambda",BLUE)
    d.text(492,440,"애플리케이션 VPC 외부 실행",16,MUTED)
    d.card(900,175,260,90,"DynamoDB","오류 횟수 · 집계 · 일일 한도","dynamodb",BLUE)
    d.card(1240,175,240,90,"AI 분석 API","사용 설정 · 호출 한도 적용",color=PURPLE,dash=True)
    d.card(1240,410,240,90,"Amazon SNS","한국어 오류 알림","sns",PURPLE)
    d.card(1540,410,180,90,"이메일","운영자 수신 확인",color=INK)
    d.card(900,510,290,80,"EventBridge Scheduler","10분 집계 후 한 번 실행 · 자동 삭제",color=PURPLE)
    d.text(70,620,"평소 개별 알림 · 3분 안에 10회 발생하면 10번째부터 10분 집계 · 정기 점검 없음",17,MUTED)
    d.text(70,650,"인프라 자동 복구 권한 없음 · AI 실패 시 기본 알림 · Lambda 처리 실패는 별도 CloudWatch 알람으로 감지",17,MUTED)
    d.text(42,741,"운영 제어: 민감정보 제거 · 일일 호출 한도 · 재전송 제외 · 버킷 식별자만 예약에 전달 · 인프라 자동 복구 없음",17,MUTED)
    d.save("aiops-architecture")


if __name__ == "__main__":
    cloud()
    delivery()
    aiops()
    print("Generated 3 self-contained SVG architecture diagrams.")
