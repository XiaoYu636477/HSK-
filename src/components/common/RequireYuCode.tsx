/**
 * RequireYuCode
 * 包裹需要小Yu码才能使用的按钮/区域。
 * - 已激活：直接渲染子内容
 * - 未激活：拦截点击并弹出激活弹窗
 */
import { type ReactNode } from 'react';
import { useYuCode } from '@/contexts/YuCodeContext';

interface RequireYuCodeProps {
  children: ReactNode;
  /** 已激活时渲染 children，否则渲染此内容（可选，默认与 children 相同） */
  fallback?: ReactNode;
}

export default function RequireYuCode({ children, fallback }: RequireYuCodeProps) {
  const { isActivated, openModal } = useYuCode();

  if (isActivated) return <>{children}</>;

  // 未激活：用一个透明拦截层覆盖 fallback（或 children）
  return (
    <div className="relative inline-block w-full">
      <div className="pointer-events-none opacity-60 select-none">
        {fallback ?? children}
      </div>
      <button
        onClick={openModal}
        className="absolute inset-0 z-10 cursor-pointer bg-transparent w-full h-full"
        aria-label="需要小Yu码才能使用此功能"
      />
    </div>
  );
}
