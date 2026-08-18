import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Dashboard from './pages/Dashboard';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';

const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <BrowserRouter>
            <CssBaseline />
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} /> {/* 홈은 대시보드로 리디렉트 */}
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
