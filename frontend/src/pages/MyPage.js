// src/pages/MyPage.js
import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    Divider,
    IconButton,
    InputAdornment,
    Snackbar,
    CircularProgress,
    Chip,
    Tooltip,
    Skeleton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';

import AuthLayout from '../components/AuthLayout';
import api from '../api/api';

const REGIONS = [
    { value: 'SEOUL', label: '서울' },
    { value: 'BUSAN', label: '부산' },
    { value: 'INCHEON', label: '인천' },
    { value: 'DAEGU', label: '대구' },
    { value: 'DAEJEON', label: '대전' },
    { value: 'GWANGJU', label: '광주' },
    { value: 'JEJU', label: '제주도' },
];

const normalizeRegion = (v) => {
    const value = (v || 'SEOUL').toString().trim().toUpperCase();
    return REGIONS.some((r) => r.value === value) ? value : 'SEOUL';
};

export default function MyPage() {
    const themeColor = '#f76d57';
    const accent2 = '#ffb199';

    // ✅ 웹에서도 모바일 레이아웃 고정
    const isMobile = true;

    const navigate = useNavigate();

    const [loadingMe, setLoadingMe] = useState(true);
    const [me, setMe] = useState(null); // { email, weatherRegion }
    const [region, setRegion] = useState('SEOUL');

    // 비밀번호 입력(저장 버튼으로 함께 저장)
    const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
    const [showPw, setShowPw] = useState({ current: false, next: false });

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
    const [copied, setCopied] = useState(false);

    const regionLabel = useMemo(() => {
        const found = REGIONS.find((r) => r.value === region);
        return found ? found.label : region;
    }, [region]);

    const toast = (message, severity = 'success') => setSnack({ open: true, message, severity });

    const fetchMe = async () => {
        setLoadingMe(true);
        setError('');
        try {
            const res = await api.get('/auth/me');
            const email = res.data?.email || '';
            const wr = normalizeRegion(res.data?.weatherRegion);
            setMe({ email, weatherRegion: wr });
            setRegion(wr);
            localStorage.setItem('weatherRegion', wr);
        } catch (e) {
            setError(
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.message ||
                '내 정보를 불러오지 못했습니다.'
            );
        } finally {
            setLoadingMe(false);
        }
    };

    useEffect(() => {
        fetchMe();
    }, []);

    const copyEmail = async () => {
        if (!me?.email) return;
        try {
            await navigator.clipboard.writeText(me.email);
            setCopied(true);
            toast('이메일을 복사했어요.');
            setTimeout(() => setCopied(false), 900);
        } catch {
            toast('복사에 실패했어요.', 'error');
        }
    };

    // 변경사항 체크
    const regionChanged = useMemo(() => {
        if (!me) return false;
        return region && region !== me.weatherRegion;
    }, [me, region]);

    // 비밀번호 변경 입력이 “둘 다” 들어오면 변경으로 간주
    const passwordChangeRequested = useMemo(() => {
        const cur = pw.currentPassword.trim();
        const next = pw.newPassword.trim();
        return cur.length > 0 || next.length > 0; // 입력 시작만 해도 “요청” 상태
    }, [pw]);

    // 실제로 저장 가능한 비번 조건(둘 다 있고, 새 비번 8자 이상)
    const passwordSavable = useMemo(() => {
        const cur = pw.currentPassword.trim();
        const next = pw.newPassword.trim();
        if (cur.length === 0 && next.length === 0) return false; // 아예 안 바꾸는 경우
        return cur.length >= 1 && next.length >= 8;
    }, [pw]);

    // 저장 버튼 활성화 조건: (지역 변경) or (비번 저장 가능)
    const canSave = useMemo(() => {
        return (regionChanged || passwordSavable) && !saving && !loadingMe;
    }, [regionChanged, passwordSavable, saving, loadingMe]);

    // 되돌리기: 지역 + 비번 입력까지 “초기화”
    const handleReset = () => {
        setRegion(me?.weatherRegion || 'SEOUL');
        setPw({ currentPassword: '', newPassword: '' });
        toast('변경사항을 되돌렸어요.', 'info');
    };

    // ✅ 저장 버튼 하나로 “지역 + 비밀번호” 같이 저장
    const handleSaveAll = async () => {
        if (saving || loadingMe) return;

        // 아무것도 바꿀 게 없으면 안내
        if (!regionChanged && !passwordSavable) {
            if (passwordChangeRequested && !passwordSavable) {
                toast('비밀번호는 “현재 비밀번호 + 새 비밀번호(8자 이상)”를 모두 입력해 주세요.', 'warning');
            } else {
                toast('저장할 변경사항이 없어요.', 'info');
            }
            return;
        }

        setSaving(true);
        setError('');

        try {
            // 1) 지역 저장
            if (regionChanged) {
                await api.put('/auth/me/weather-region', { weatherRegion: region });
                setMe((prev) => (prev ? { ...prev, weatherRegion: region } : prev));
                localStorage.setItem('weatherRegion', region);
            }

            // 2) 비밀번호 저장
            if (passwordSavable) {
                await api.put('/auth/me/password', {
                    currentPassword: pw.currentPassword,
                    newPassword: pw.newPassword,
                });
                setPw({ currentPassword: '', newPassword: '' });
            }

            // 토스트 메시지
            if (regionChanged && passwordSavable) {
                toast('지역과 비밀번호를 저장했어요.');
            } else if (regionChanged) {
                toast(`선호 지역을 "${regionLabel}"로 저장했어요.`);
            } else {
                toast('비밀번호를 저장했어요.');
            }

            // ✅ 저장 후 대시보드로 이동
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 650);
        } catch (e) {
            setError(
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.message ||
                '저장에 실패했습니다.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <AuthLayout logoType="default">
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                {/* Title */}
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.1,
                            color: 'rgba(255,255,255,0.92)',
                        }}
                    >
                        마이페이지
                    </Typography>
                    <Typography sx={{ mt: 0.8, color: 'rgba(255,255,255,0.62)' }} variant="body2">
                        내 정보와 개인화 설정을 관리하세요
                    </Typography>
                </Box>

                {/* ✅ Always 1-column + space for bottom actions */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: '1fr',
                        alignItems: 'start',
                        pb: 8,
                    }}
                >
                    {/* Profile/Personalization */}
                    <GlassCard themeColor={themeColor} title="계정 정보" subtitle="이메일 · 선호 지역" icon={<PublicRoundedIcon />}>
                        {loadingMe ? (
                            <Box>
                                <Skeleton height={28} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                                <Skeleton height={28} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                                <Skeleton height={64} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                            </Box>
                        ) : (
                            <>
                                {/* Email row */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.65)' }} variant="caption">
                                            이메일
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: 'rgba(255,255,255,0.92)',
                                                fontWeight: 900,
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {me?.email}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            size="small"
                                            icon={<ShieldRoundedIcon style={{ color: 'rgba(255,255,255,0.85)' }} />}
                                            label="Protected"
                                            sx={{
                                                color: 'rgba(255,255,255,0.88)',
                                                bgcolor: 'rgba(255,255,255,0.10)',
                                                border: '1px solid rgba(255,255,255,0.14)',
                                                fontWeight: 900,
                                            }}
                                        />
                                        <Tooltip title={copied ? '복사됨!' : '이메일 복사'}>
                                            <IconButton
                                                onClick={copyEmail}
                                                sx={{
                                                    color: 'rgba(255,255,255,0.85)',
                                                    bgcolor: 'rgba(255,255,255,0.08)',
                                                    border: '1px solid rgba(255,255,255,0.10)',
                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                                                }}
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 2, opacity: 0.25, borderColor: 'rgba(255,255,255,0.25)' }} />

                                {/* Region Select */}
                                <Typography sx={{ color: 'rgba(255,255,255,0.86)', fontWeight: 900, mb: 0.8 }}>
                                    선호 지역
                                </Typography>

                                <FormControl fullWidth>
                                    <InputLabel sx={{ color: 'rgba(255,255,255,0.65)' }}>선호 지역</InputLabel>
                                    <Select
                                        value={region}
                                        label="선호 지역"
                                        onChange={(e) => setRegion(normalizeRegion(e.target.value))}
                                        disabled={saving || loadingMe}
                                        sx={glassSelectSx(themeColor)}
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    bgcolor: 'rgba(20,20,20,0.95)',
                                                    border: '1px solid rgba(255,255,255,0.10)',
                                                    backdropFilter: 'blur(10px)',
                                                    color: 'rgba(255,255,255,0.92)',
                                                },
                                            },
                                        }}
                                    >
                                        {REGIONS.map((r) => (
                                            <MenuItem key={r.value} value={r.value}>
                                                {r.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Typography sx={{ mt: 1.1, color: 'rgba(255,255,255,0.55)' }} variant="caption">
                                    저장하면 대시보드에 바로 반영됩니다.
                                </Typography>
                            </>
                        )}
                    </GlassCard>

                    {/* Password */}
                    <GlassCard themeColor={themeColor} title="비밀번호" subtitle="저장 버튼으로 함께 반영" icon={<ShieldRoundedIcon />}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.62)' }} variant="body2">
                            새 비밀번호는 8자 이상을 권장합니다.
                        </Typography>

                        <TextField
                            margin="normal"
                            fullWidth
                            label="현재 비밀번호"
                            type={showPw.current ? 'text' : 'password'}
                            value={pw.currentPassword}
                            onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
                            disabled={saving}
                            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.65)' } }}
                            sx={glassTextFieldSx(themeColor)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPw((v) => ({ ...v, current: !v.current }))}
                                            edge="end"
                                            disabled={saving}
                                            sx={{ color: 'rgba(255,255,255,0.72)' }}
                                        >
                                            {showPw.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            margin="normal"
                            fullWidth
                            label="새 비밀번호"
                            type={showPw.next ? 'text' : 'password'}
                            value={pw.newPassword}
                            onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                            disabled={saving}
                            helperText="새 비밀번호는 8자 이상"
                            FormHelperTextProps={{ style: { color: 'rgba(255,255,255,0.55)' } }}
                            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.65)' } }}
                            sx={glassTextFieldSx(themeColor)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPw((v) => ({ ...v, next: !v.next }))}
                                            edge="end"
                                            disabled={saving}
                                            sx={{ color: 'rgba(255,255,255,0.72)' }}
                                        >
                                            {showPw.next ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* 안내: 버튼 제거 요청이라 문구만 최소 */}
                        <Typography sx={{ mt: 1.0, color: 'rgba(255,255,255,0.55)' }} variant="caption">
                            비밀번호 변경은 하단 “저장”을 눌러 확정됩니다.
                        </Typography>
                    </GlassCard>
                </Box>

                {/* ✅ Fixed bottom actions (always) — session 문구 제거 완료 */}
                {!loadingMe && (
                    <Box
                        sx={{
                            position: 'fixed',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 60,
                            p: 1.2,
                            pb: 1.6,
                            backdropFilter: 'blur(14px)',
                            background:
                                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,10,10,0.85) 40%, rgba(10,10,10,0.92) 100%)',
                        }}
                    >
                        <Box sx={{ maxWidth: 520, mx: 'auto' }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleReset}
                                    disabled={saving}
                                    startIcon={<RestartAltRoundedIcon />}
                                    sx={outlineButtonSx()}
                                >
                                    되돌리기
                                </Button>

                                <Button
                                    variant="contained"
                                    disableElevation
                                    onClick={handleSaveAll}
                                    disabled={!canSave}
                                    startIcon={<SaveRoundedIcon />}
                                    sx={primaryButtonSx(themeColor, accent2)}
                                >
                                    {saving ? '저장 중…' : '저장'}
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                        {error}
                    </Alert>
                )}

                <Snackbar
                    open={snack.open}
                    autoHideDuration={2200}
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setSnack((s) => ({ ...s, open: false }))}
                        severity={snack.severity}
                        sx={{ borderRadius: 3 }}
                    >
                        {snack.message}
                    </Alert>
                </Snackbar>
            </motion.div>
        </AuthLayout>
    );
}

/** ---------- UI helpers ---------- */

function GlassCard({ title, subtitle, icon, themeColor, children }) {
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            sx={{
                position: 'relative',
                borderRadius: 6,
                p: { xs: 2.0, sm: 2.4 },
                bgcolor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: `radial-gradient(700px circle at 50% 0%, ${themeColor}22, transparent 60%)`,
                }}
            />
            <Box sx={{ position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                    <Box
                        sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2.5,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.88)',
                        }}
                    >
                        {icon}
                    </Box>
                    <Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 900 }} variant="subtitle1">
                            {title}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.58)' }} variant="caption">
                            {subtitle}
                        </Typography>
                    </Box>
                </Box>
                {children}
            </Box>
        </Box>
    );
}

function glassTextFieldSx(themeColor) {
    return {
        '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.88)',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.16)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.28)' },
            '&.Mui-focused fieldset': { borderColor: `${themeColor}88` },
        },
    };
}

function glassSelectSx(themeColor) {
    return {
        borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.88)',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.16)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.28)' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${themeColor}88` },
        '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.80)' },
    };
}

function primaryButtonSx(themeColor, accent2) {
    return {
        py: 1.2,
        borderRadius: 3,
        fontWeight: 900,
        textTransform: 'none',
        background: `linear-gradient(135deg, ${themeColor}, ${accent2})`,
        boxShadow: `0 16px 34px ${themeColor}22`,
        '&:hover': {
            background: `linear-gradient(135deg, ${themeColor}, ${accent2})`,
            filter: 'brightness(0.98)',
            transform: 'translateY(-1px)',
        },
        transition: 'transform 0.15s ease, filter 0.15s ease',
    };
}

function outlineButtonSx() {
    return {
        py: 1.2,
        borderRadius: 3,
        fontWeight: 900,
        textTransform: 'none',
        color: 'rgba(255,255,255,0.85)',
        borderColor: 'rgba(255,255,255,0.16)',
        bgcolor: 'rgba(255,255,255,0.02)',
        '&:hover': {
            borderColor: 'rgba(255,255,255,0.26)',
            bgcolor: 'rgba(255,255,255,0.05)',
        },
    };
}
