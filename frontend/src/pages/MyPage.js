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
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

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
    const themeColor = '#38bdf8';
    const accent2 = '#818cf8';

    const navigate = useNavigate();

    const [loadingMe, setLoadingMe] = useState(true);
    const [me, setMe] = useState(null);
    const [region, setRegion] = useState('SEOUL');

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

    const regionChanged = useMemo(() => {
        if (!me) return false;
        return region && region !== me.weatherRegion;
    }, [me, region]);

    const passwordChangeRequested = useMemo(() => {
        const cur = pw.currentPassword.trim();
        const next = pw.newPassword.trim();
        return cur.length > 0 || next.length > 0;
    }, [pw]);

    const passwordSavable = useMemo(() => {
        const cur = pw.currentPassword.trim();
        const next = pw.newPassword.trim();
        if (cur.length === 0 && next.length === 0) return false;
        return cur.length >= 1 && next.length >= 8;
    }, [pw]);

    const canSave = useMemo(() => {
        return (regionChanged || passwordSavable) && !saving && !loadingMe;
    }, [regionChanged, passwordSavable, saving, loadingMe]);

    const handleReset = () => {
        setRegion(me?.weatherRegion || 'SEOUL');
        setPw({ currentPassword: '', newPassword: '' });
        toast('변경사항을 되돌렸어요.', 'info');
    };

    const handleSaveAll = async () => {
        if (saving || loadingMe) return;

        if (!regionChanged && !passwordSavable) {
            if (passwordChangeRequested && !passwordSavable) {
                toast('비밀번호는 현재 비밀번호와 새 비밀번호(8자 이상)를 모두 입력해 주세요.', 'warning');
            } else {
                toast('저장할 변경사항이 없어요.', 'info');
            }
            return;
        }

        setSaving(true);
        setError('');

        try {
            if (regionChanged) {
                await api.put('/auth/me/weather-region', { weatherRegion: region });
                setMe((prev) => (prev ? { ...prev, weatherRegion: region } : prev));
                localStorage.setItem('weatherRegion', region);
            }

            if (passwordSavable) {
                await api.put('/auth/me/password', {
                    currentPassword: pw.currentPassword,
                    newPassword: pw.newPassword,
                });
                setPw({ currentPassword: '', newPassword: '' });
            }

            if (regionChanged && passwordSavable) {
                toast('지역과 비밀번호를 저장했어요.');
            } else if (regionChanged) {
                toast(`선호 지역을 "${regionLabel}"로 저장했어요.`);
            } else {
                toast('비밀번호를 저장했어요.');
            }

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
                <Box sx={{ mb: 2.2, textAlign: 'center' }}>
                    <Typography
                        sx={{
                            fontWeight: 900,
                            letterSpacing: '-0.04em',
                            lineHeight: 1.08,
                            color: '#0f172a',
                            fontSize: { xs: 27, sm: 31 },
                        }}
                    >
                        마이페이지
                    </Typography>
                    <Typography
                        sx={{
                            mt: 1,
                            color: '#64748b',
                            fontSize: 14,
                            lineHeight: 1.6,
                            fontWeight: 500,
                        }}
                    >
                        내 정보와 개인화 설정을
                        <br />
                        깔끔하게 관리해보세요
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: '1fr',
                        alignItems: 'start',
                        pb: 10,
                    }}
                >
                    <GlassCard
                        themeColor={themeColor}
                        title="계정 정보"
                        subtitle="이메일 · 선호 지역"
                        icon={<PersonRoundedIcon />}
                    >
                        {loadingMe ? (
                            <Box>
                                <Skeleton height={28} sx={{ borderRadius: 2 }} />
                                <Skeleton height={28} sx={{ borderRadius: 2 }} />
                                <Skeleton height={64} sx={{ borderRadius: 3 }} />
                            </Box>
                        ) : (
                            <>
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
                                        <Typography sx={{ color: '#64748b', fontWeight: 700 }} variant="caption">
                                            이메일
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: '#0f172a',
                                                fontWeight: 900,
                                                wordBreak: 'break-word',
                                                mt: 0.4,
                                            }}
                                        >
                                            {me?.email}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            size="small"
                                            icon={<ShieldRoundedIcon style={{ color: '#0369a1' }} />}
                                            label="Protected"
                                            sx={{
                                                color: '#0369a1',
                                                bgcolor: 'rgba(14,165,233,0.10)',
                                                border: '1px solid rgba(14,165,233,0.14)',
                                                fontWeight: 900,
                                                borderRadius: '999px',
                                            }}
                                        />
                                        <Tooltip title={copied ? '복사됨!' : '이메일 복사'}>
                                            <IconButton
                                                onClick={copyEmail}
                                                sx={softIconButtonSx()}
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 2, borderColor: 'rgba(203,213,225,0.7)' }} />

                                <Typography sx={{ color: '#0f172a', fontWeight: 900, mb: 0.8 }}>
                                    선호 지역
                                </Typography>

                                <FormControl fullWidth>
                                    <InputLabel sx={{ color: '#64748b', fontWeight: 600 }}>
                                        선호 지역
                                    </InputLabel>
                                    <Select
                                        value={region}
                                        label="선호 지역"
                                        onChange={(e) => setRegion(normalizeRegion(e.target.value))}
                                        disabled={saving || loadingMe}
                                        sx={softSelectSx(themeColor)}
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    bgcolor: '#ffffff',
                                                    border: '1px solid rgba(226,232,240,0.9)',
                                                    boxShadow: '0 12px 30px rgba(148,163,184,0.16)',
                                                    color: '#0f172a',
                                                    borderRadius: '16px',
                                                },
                                            },
                                        }}
                                        startAdornment={
                                            <InputAdornment position="start">
                                                <PlaceRoundedIcon sx={{ color: '#64748b', fontSize: 20, mr: 0.5 }} />
                                            </InputAdornment>
                                        }
                                    >
                                        {REGIONS.map((r) => (
                                            <MenuItem key={r.value} value={r.value}>
                                                {r.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Typography sx={{ mt: 1.1, color: '#64748b', fontWeight: 600 }} variant="caption">
                                    저장하면 대시보드에 바로 반영됩니다.
                                </Typography>
                            </>
                        )}
                    </GlassCard>

                    <GlassCard
                        themeColor={accent2}
                        title="비밀번호"
                        subtitle="저장 버튼으로 함께 반영"
                        icon={<LockRoundedIcon />}
                    >
                        <Typography sx={{ color: '#64748b', fontWeight: 500 }} variant="body2">
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
                            InputLabelProps={{ style: { color: '#64748b', fontWeight: 600 } }}
                            sx={softTextFieldSx(themeColor)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPw((v) => ({ ...v, current: !v.current }))}
                                            edge="end"
                                            disabled={saving}
                                            sx={{ color: '#64748b' }}
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
                            FormHelperTextProps={{ style: { color: '#64748b', fontWeight: 500 } }}
                            InputLabelProps={{ style: { color: '#64748b', fontWeight: 600 } }}
                            sx={softTextFieldSx(themeColor)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPw((v) => ({ ...v, next: !v.next }))}
                                            edge="end"
                                            disabled={saving}
                                            sx={{ color: '#64748b' }}
                                        >
                                            {showPw.next ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Typography sx={{ mt: 1, color: '#64748b', fontWeight: 600 }} variant="caption">
                            비밀번호 변경은 하단 저장 버튼을 눌러 확정됩니다.
                        </Typography>
                    </GlassCard>
                </Box>

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
                            backdropFilter: 'blur(16px)',
                            background:
                                'linear-gradient(180deg, rgba(245,251,255,0) 0%, rgba(245,251,255,0.78) 38%, rgba(245,251,255,0.94) 100%)',
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
                    <Alert
                        severity="error"
                        sx={{
                            mt: 2,
                            borderRadius: '18px',
                            border: '1px solid rgba(239,68,68,0.16)',
                        }}
                    >
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
                        sx={{ borderRadius: '18px' }}
                    >
                        {snack.message}
                    </Alert>
                </Snackbar>
            </motion.div>
        </AuthLayout>
    );
}

function GlassCard({ title, subtitle, icon, themeColor, children }) {
    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            sx={{
                position: 'relative',
                borderRadius: '28px',
                p: { xs: 2.1, sm: 2.5 },
                background:
                    'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(240,249,255,0.96) 52%, rgba(248,250,252,0.94) 100%)',
                border: '1px solid rgba(255,255,255,0.92)',
                boxShadow: '0 16px 40px rgba(148,163,184,0.14)',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: `radial-gradient(540px circle at 50% 0%, ${themeColor}16, transparent 62%)`,
                }}
            />
            <Box sx={{ position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.3 }}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '14px',
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(255,255,255,0.72)',
                            border: '1px solid rgba(255,255,255,0.92)',
                            color: '#334155',
                            boxShadow: '0 8px 18px rgba(148,163,184,0.08)',
                        }}
                    >
                        {icon}
                    </Box>
                    <Box>
                        <Typography sx={{ color: '#0f172a', fontWeight: 900 }} variant="subtitle1">
                            {title}
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontWeight: 600 }} variant="caption">
                            {subtitle}
                        </Typography>
                    </Box>
                </Box>
                {children}
            </Box>
        </Box>
    );
}

function softTextFieldSx(themeColor) {
    return {
        '& .MuiOutlinedInput-root': {
            borderRadius: '18px',
            bgcolor: 'rgba(255,255,255,0.78)',
            color: '#0f172a',
            fontWeight: 600,
            '& fieldset': { borderColor: 'rgba(203,213,225,0.9)' },
            '&:hover fieldset': { borderColor: 'rgba(148,163,184,0.9)' },
            '&.Mui-focused fieldset': {
                borderColor: themeColor,
                boxShadow: `0 0 0 3px ${themeColor}18`,
            },
        },
    };
}

function softSelectSx(themeColor) {
    return {
        borderRadius: '18px',
        bgcolor: 'rgba(255,255,255,0.78)',
        color: '#0f172a',
        fontWeight: 600,
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(203,213,225,0.9)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.9)' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: themeColor,
            boxShadow: `0 0 0 3px ${themeColor}18`,
        },
        '& .MuiSvgIcon-root': { color: '#64748b' },
    };
}

function softIconButtonSx() {
    return {
        color: '#475569',
        bgcolor: 'rgba(255,255,255,0.74)',
        border: '1px solid rgba(255,255,255,0.92)',
        boxShadow: '0 8px 18px rgba(148,163,184,0.08)',
        '&:hover': {
            bgcolor: 'rgba(255,255,255,0.96)',
        },
    };
}

function primaryButtonSx(themeColor, accent2) {
    return {
        py: 1.2,
        borderRadius: '18px',
        fontWeight: 900,
        textTransform: 'none',
        color: '#fff',
        background: `linear-gradient(135deg, ${themeColor}, ${accent2})`,
        boxShadow: '0 16px 30px rgba(99,102,241,0.20)',
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
        borderRadius: '18px',
        fontWeight: 900,
        textTransform: 'none',
        color: '#334155',
        borderColor: 'rgba(203,213,225,0.9)',
        bgcolor: 'rgba(255,255,255,0.72)',
        boxShadow: '0 8px 18px rgba(148,163,184,0.08)',
        '&:hover': {
            borderColor: 'rgba(148,163,184,0.9)',
            bgcolor: 'rgba(255,255,255,0.94)',
        },
    };
}
