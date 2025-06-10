import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';

import Dashboard from './pages/Dashboard';
import SignUpPage from './pages/SignUpPage';
import LoginPage from "./pages/LoginPage";

function App() {
    return (
        <BrowserRouter>
            {/* CssBaseline은 브라우저의 기본 스타일을 초기화해주므로 유지하는 것이 좋습니다. */}
            <CssBaseline />

            {/* Routes와 Route를 통해 URL 경로에 맞는 페이지만을 렌더링합니다. */}
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/login" element={<LoginPage />} /> {/* /login 경로 추가 */}
            </Routes>
        </BrowserRouter>
    );
}

export default App;
