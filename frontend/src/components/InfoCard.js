import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import MiniChart from './MiniChart'; // 차트 컴포넌트를 곧 생성할 예정입니다.

// 아이콘 타입에 따라 실제 아이콘 컴포넌트를 매핑합니다.
const iconMap = {
    ShowChart: ShowChartIcon,
};

function InfoCard({
                      icon,
                      iconType,
                      iconColor,
                      title,
                      subtitle,
                      mainValue,
                      leftValue,
                      rightValue,
                      changeValue,
                      changeColor,
                      chartData,
                      chartColor,
                  }) {
    const isPositive = changeValue && changeValue.startsWith('+');
    const IconComponent = iconType ? iconMap[iconType] : null;

    return (
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)' }}>
            <CardContent>
                {/* 상단: 아이콘과 제목 */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {IconComponent ? (
                        <IconComponent sx={{ color: iconColor, mr: 1 }} />
                    ) : (
                        <Typography sx={{ mr: 1, fontSize: '24px' }}>{icon}</Typography>
                    )}
                    <Box>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* 중간: 주가 또는 환율 정보 */}
                {mainValue && (
                    <Typography variant="h4" component="div" align="right" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {mainValue}
                    </Typography>
                )}

                {leftValue && rightValue && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6" color="text.secondary">
                            {leftValue}
                        </Typography>
                        {chartData && (
                            <Box sx={{ width: '50%', height: 40 }}>
                                <MiniChart data={chartData} color={chartColor} />
                            </Box>
                        )}
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {rightValue}
                        </Typography>
                    </Box>
                )}

                {/* 하단: 등락 정보 */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: changeColor }}>
                    {isPositive ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {changeValue.replace('+', '').replace('-', '')}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

export default InfoCard;