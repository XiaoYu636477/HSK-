import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useYuCode } from '@/contexts/YuCodeContext';
import { routes } from '@/routes';

export default function RouteGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isActivated, loading: yuCodeLoading, openModal } = useYuCode();
  const location = useLocation();

  if (authLoading || yuCodeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Find if current route is public
  const currentRoute = routes.find(r => 
    r.path === location.pathname || 
    (r.bare && location.pathname.endsWith(r.path))
  );
  
  const isPublic = currentRoute?.public;

  if (!user && !isPublic) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  // 如果已登录但未激活，且访问的不是首页/个人主页/管理员页，要求激活
  if (user && !isActivated && !isPublic && location.pathname !== '/profile') {
    // 异步打开弹窗，避免在渲染期更新状态
    setTimeout(() => openModal(), 0);
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}