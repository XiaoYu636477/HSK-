import type { ReactNode } from 'react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import EssayPage from './pages/EssayPage';
import HomeworkPage from './pages/HomeworkPage';
import OralPage from './pages/OralPage';
import ScorePage from './pages/ScorePage';
import TipsPage from './pages/TipsPage';
import HistoryPage from './pages/HistoryPage';
import PracticePage from './pages/PracticePage';
import TemplatesPage from './pages/TemplatesPage';
import ExamPage from './pages/ExamPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
  /** 跳过 AppLayout（无侧边栏/顶栏） */
  bare?: boolean;
}

export const routes: RouteConfig[] = [
  { name: '首页',     path: '/',         element: <HomePage />,     public: true },
  { name: '登录',     path: '/login',    element: <LoginPage />,    public: true },
  { name: '作文批改', path: '/essay',    element: <EssayPage /> },
  { name: '作业批改', path: '/homework', element: <HomeworkPage /> },
  { name: '口语分析', path: '/oral',     element: <OralPage /> },
  { name: '成绩分析', path: '/score',    element: <ScorePage /> },
  { name: '学习技巧', path: '/tips',     element: <TipsPage /> },
  { name: '历史记录', path: '/history',  element: <HistoryPage /> },
  { name: '练习题库', path: '/practice', element: <PracticePage /> },
  { name: '备考模板', path: '/templates',element: <TemplatesPage /> },
  { name: '考题解析', path: '/exam',     element: <ExamPage /> },
  { name: '学习舱',   path: '/profile',  element: <ProfilePage /> },
  { name: '管理后台', path: '/yuteacher', element: <AdminPage />, public: true, bare: true },
];
