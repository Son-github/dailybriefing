import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import MiniChart from './MiniChart';

const iconMap = {
    ShowChart: ShowChartIcon,
    PriceChangeIcon: PriceChangeIcon,
};

function InfoCard({
                      icon,
                      iconType,
                      iconColor = 'primary.main',
                      title,
                      subtitle,
                      mainValue,
                      leftValue,
                      rightValue,
                      changeValue,
                      changeColor = '#4caf50',
                      chartData,
                      chartColor,
                  }) {
    const isPositive = changeValue?.startsWith('+');
    const IconComponent = iconType && iconMap[iconType];

    return (
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <CardContent>
                {/* 상단: 아이콘 + 타이틀 */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    {IconComponent ? (
                        <IconComponent sx={{ color: iconColor, fontSize: 28, mr: 1 }} />
                    ) : (
                        <Typography sx={{ mr: 1, fontSize: 24 }}>{icon}</Typography>
                    )}
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* 메인값 */}
                {mainValue && (
                    <Typography
                        variant="h4"
                        align="right"
                        sx={{ fontWeight: 'bold', mb: 1 }}
                    >
                        {mainValue}
                    </Typography>
                )}

                {/* 차트 & 부가 수치 */}
                {(leftValue || rightValue) && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                            gap: 1,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                            {leftValue}
                        </Typography>

                        {chartData && (
                            <Box sx={{ flex: 2 }}>
                                <MiniChart data={chartData} color={chartColor} />
                            </Box>
                        )}

                        <Typography variant="body1" sx={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }}>
                            {rightValue}
                        </Typography>
                    </Box>
                )}

                {/* 하단 변화율 */}
                {changeValue && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', color: changeColor }}>
                        {isPositive ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                        <Typography variant="body2" fontWeight="bold">
                            {changeValue.replace(/^[+-]/, '')}
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}

export default InfoCard;
