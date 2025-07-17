import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Dashboard from './pages/Dashboard';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import axios from 'axios';

const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
    useEffect(() => {
        const accessToken = localStorage.getItem('token');
        if (accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
    }, []);

    return (
        <BrowserRouter>
            <CssBaseline />
            <Routes>
                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

