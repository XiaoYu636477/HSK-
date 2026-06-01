import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import OnboardingTour from '@/components/common/OnboardingTour';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { YuCodeProvider } from '@/contexts/YuCodeContext';
import YuCodeModal from '@/components/common/YuCodeModal';
import AppLayout from '@/components/layouts/AppLayout';
import RouteGuard from '@/components/common/RouteGuard';
import { routes } from './routes';

function AppRoutes() {
  const location = useLocation();

  // 支持预览环境前缀（如 /preview/admin），只要末尾路径匹配 bare 路由即可
  const isBare = routes.some(
    r => r.bare && (
      location.pathname === r.path ||
      location.pathname.endsWith(r.path)
    )
  );

  // bare 路由（/admin 等）直接渲染，不套任何布局，也不挂 YuCodeModal
  if (isBare) {
    return (
      <RouteGuard>
        <Routes>
          {routes.filter(r => r.bare).map((route, i) => (
            <Route key={i} path={route.path} element={route.element} />
          ))}
          {/* 兼容预览环境前缀，如 /preview/admin */}
          {routes.filter(r => r.bare).map((route, i) => (
            <Route key={`preview-${i}`} path={`*/yuteacher`} element={route.element} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteGuard>
    );
  }

  const isLoginPage = location.pathname === '/login';

  return (
    <RouteGuard>
      {isLoginPage ? (
        <Routes>
          {routes.map((route, i) => (
            <Route key={i} path={route.path} element={route.element} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <AppLayout>
          <Routes>
            {routes.map((route, i) => (
              <Route key={i} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <OnboardingTour />
        </AppLayout>
      )}
      {/* 全局小Yu码激活弹窗（非 bare / 非登录页时挂载） */}
      {!isLoginPage && <YuCodeModal />}
    </RouteGuard>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <YuCodeProvider>
            <IntersectObserver />
            <AppRoutes />
            <Toaster />
          </YuCodeProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
