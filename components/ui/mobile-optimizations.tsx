'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useMobile, useDeviceType } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  MoreHorizontal,
  X
} from 'lucide-react';

// Enhanced mobile-first container
export interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  safeArea?: boolean;
}

export function MobileContainer({ 
  children, 
  className = '', 
  padding = 'md',
  safeArea = true 
}: MobileContainerProps) {
  const isMobile = useMobile();
  
  const getPadding = () => {
    if (padding === 'none') return '';
    
    const paddingMap = {
      sm: isMobile ? 'p-3' : 'p-4',
      md: isMobile ? 'p-4' : 'p-6',
      lg: isMobile ? 'p-6' : 'p-8'
    };
    
    return paddingMap[padding];
  };

  return (
    <div 
      className={cn(
        'w-full',
        getPadding(),
        safeArea && 'pb-safe',
        className
      )}
      style={{
        paddingBottom: safeArea ? 'calc(env(safe-area-inset-bottom) + 1rem)' : undefined
      }}
    >
      {children}
    </div>
  );
}

// Collapsible section for mobile
export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  className?: string;
  headerClassName?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  badge,
  className = '',
  headerClassName = ''
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useMobile();

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full justify-between p-4 h-auto text-left hover:bg-gray-50',
          isMobile && 'min-h-[56px] text-base',
          headerClassName
        )}
      >
        <div className="flex items-center space-x-3">
          <span className="font-medium">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </Button>
      
      {isOpen && (
        <div className="border-t bg-white animate-slide-down">
          <div className="p-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile-optimized action sheet
export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'secondary';
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  className?: string;
}

export function ActionSheet({
  isOpen,
  onClose,
  title,
  actions,
  className = ''
}: ActionSheetProps) {
  const isMobile = useMobile();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-white rounded-t-xl animate-slide-up',
          'max-h-[80vh] overflow-y-auto',
          className
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="p-4 space-y-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'ghost'}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className={cn(
                'w-full justify-start h-14 text-base font-normal',
                action.variant === 'destructive' && 'text-red-600 hover:text-red-700 hover:bg-red-50'
              )}
            >
              {action.icon && (
                <span className="mr-3 flex-shrink-0">
                  {action.icon}
                </span>
              )}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized tabs
export interface MobileTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    badge?: string | number;
    content: React.ReactNode;
  }>;
  defaultTab?: string;
  className?: string;
}

export function MobileTabs({ 
  tabs, 
  defaultTab, 
  className = '' 
}: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const isMobile = useMobile();

  return (
    <div className={cn('w-full', className)}>
      {/* Tab Navigation */}
      <div className={cn(
        'flex border-b bg-white sticky top-0 z-10',
        isMobile ? 'overflow-x-auto scrollbar-hide' : 'flex-wrap'
      )}>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-none border-b-2 border-transparent',
              'whitespace-nowrap flex-shrink-0',
              isMobile ? 'h-12 px-4 text-sm' : 'h-10 px-3 text-sm',
              activeTab === tab.id && 'border-blue-500 bg-blue-50 text-blue-700'
            )}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <Badge 
                variant="secondary" 
                className="ml-2 text-xs bg-gray-200 text-gray-700"
              >
                {tab.badge}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              'animate-fade-in',
              activeTab === tab.id ? 'block' : 'hidden'
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

// Pull-to-refresh component
export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className = '',
  threshold = 80
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useMobile();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || window.scrollY > 0) return;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return;
    
    const touch = e.touches[0];
    const distance = Math.max(0, touch.clientY - 50);
    setPullDistance(Math.min(distance, threshold * 1.5));
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  };

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'transition-all duration-200 ease-out',
          'bg-blue-50 text-blue-600 text-sm font-medium'
        )}
        style={{ 
          height: `${pullDistance}px`,
          opacity: pullDistance > 20 ? 1 : 0
        }}
      >
        {isRefreshing ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Refreshing...</span>
          </div>
        ) : pullDistance >= threshold ? (
          <span>Release to refresh</span>
        ) : (
          <span>Pull to refresh</span>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Mobile-optimized floating action button
export interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  variant?: 'default' | 'secondary';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export function FloatingActionButton({
  onClick,
  icon,
  label,
  variant = 'default',
  position = 'bottom-right',
  className = ''
}: FloatingActionButtonProps) {
  const isMobile = useMobile();

  const getPositionClasses = () => {
    const base = 'fixed z-40';
    switch (position) {
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      case 'bottom-center':
        return `${base} bottom-4 left-1/2 transform -translate-x-1/2`;
      default:
        return `${base} bottom-4 right-4`;
    }
  };

  return (
    <Button
      onClick={onClick}
      variant={variant}
      className={cn(
        getPositionClasses(),
        'rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
        'animate-bounce-in',
        isMobile ? 'h-14 w-14' : 'h-12 w-12',
        label && isMobile && 'px-6 w-auto',
        className
      )}
      style={{ 
        marginBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 1rem)' : '1rem'
      }}
    >
      <span className="flex items-center space-x-2">
        {icon}
        {label && isMobile && <span className="text-sm font-medium">{label}</span>}
      </span>
    </Button>
  );
}

// Mobile-optimized sticky header
export interface StickyHeaderProps {
  children: React.ReactNode;
  className?: string;
  blur?: boolean;
}

export function StickyHeader({ 
  children, 
  className = '',
  blur = true 
}: StickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        'sticky top-0 z-30 transition-all duration-200',
        'bg-white/95',
        blur && 'backdrop-blur-sm',
        isScrolled && 'shadow-sm border-b',
        className
      )}
    >
      {children}
    </div>
  );
}