import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

function MiniChart({ data, color }) {
    return (
        // ResponsiveContainer를 사용하면 부모 요소의 크기에 맞춰 차트 크기가 조절됩니다.
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                {/* - dataKey="pv": data 배열에서 어떤 값을 사용할지 지정합니다.
          - stroke: 라인 색상을 지정합니다.
          - strokeWidth: 라인 두께를 지정합니다.
          - dot={false}: 데이터 포인트에 점을 표시하지 않습니다.
          - isAnimationActive={false}: 애니메이션을 끕니다.
        */}
                <Line type="monotone" dataKey="pv" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

export default MiniChart;