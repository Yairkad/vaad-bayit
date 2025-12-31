'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu,
  Building2,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  MessageSquare,
  AlertTriangle,
  FileText,
  BarChart3,
  Link2,
  Inbox,
  Wallet,
  CircleDollarSign,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface HeaderProps {
  userName: string;
  buildingName?: string;
  userRole?: 'admin' | 'committee' | 'tenant';
}

export function Header({ userName, buildingName, userRole = 'committee' }: HeaderProps) {
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const settingsHref = userRole === 'admin' ? '/admin/settings' : userRole === 'tenant' ? '/tenant/settings' : '/dashboard/settings';
  const profileHref = userRole === 'admin' ? '/admin/profile' : userRole === 'tenant' ? '/tenant/settings' : '/dashboard/settings';

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: tNav('dashboard'), color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    { href: '/admin/buildings', icon: Building2, label: tNav('buildings'), color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { href: '/admin/users', icon: Users, label: 'משתמשים', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { href: '/admin/requests', icon: Inbox, label: 'פניות חדשות', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  ];

  const committeeLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: tNav('dashboard'), color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { href: '/dashboard/tenants', icon: Users, label: tNav('tenants'), color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { href: '/dashboard/payments', icon: CreditCard, label: tNav('payments'), color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { href: '/dashboard/expenses', icon: Receipt, label: tNav('expenses'), color: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
    { href: '/dashboard/treasury', icon: Wallet, label: 'קופה', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { href: '/dashboard/messages', icon: MessageSquare, label: tNav('messages'), color: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
    { href: '/dashboard/issues', icon: AlertTriangle, label: tNav('issues'), color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { href: '/dashboard/documents', icon: FileText, label: tNav('documents'), color: 'bg-stone-100 text-stone-700 hover:bg-stone-200' },
    { href: '/dashboard/reports', icon: BarChart3, label: tNav('reports'), color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
    { href: '/dashboard/invites', icon: Link2, label: 'קישורי הזמנה', color: 'bg-lime-100 text-lime-700 hover:bg-lime-200' },
    { href: '/dashboard/building-settings', icon: Building2, label: 'הגדרות בניין', color: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' },
  ];

  const tenantLinks = [
    { href: '/tenant', icon: LayoutDashboard, label: tNav('myArea'), color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { href: '/tenant/payments', icon: CreditCard, label: tNav('payments'), color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { href: '/tenant/messages', icon: MessageSquare, label: tNav('messages'), color: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
    { href: '/tenant/issues', icon: AlertTriangle, label: tNav('issues'), color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { href: '/tenant/documents', icon: FileText, label: tNav('documents'), color: 'bg-stone-100 text-stone-700 hover:bg-stone-200' },
  ];

  const links = userRole === 'admin' ? adminLinks : userRole === 'committee' ? committeeLinks : tenantLinks;

  return (
    <header className="sticky top-0 z-30 h-16 bg-gradient-header border-b">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b">
              <Link
                href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2"
              >
                <img src="/icon.svg" alt="ועד בית" className="h-8 w-8" />
                <span className="text-xl font-bold">ועד בית</span>
              </Link>
            </div>

            {/* Building info on mobile */}
            {buildingName && (
              <div className="px-6 py-3 border-b bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{buildingName}</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {links.map((link) => {
                // Check if this is an exact match or a sub-path match (but not for root paths)
                const isRootPath = link.href === '/dashboard' || link.href === '/admin' || link.href === '/tenant';
                const isActive = isRootPath
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full',
                      isActive
                        ? cn(link.color, 'ring-2 ring-offset-1 ring-current/30 shadow-sm')
                        : link.color
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t mt-auto bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>גירסה 1.0.0</span>
                <a
                  href="mailto:support@vaad-bayit.co.il?subject=דיווח באג / הצעת שיפור"
                  className="text-primary hover:underline"
                >
                  דווח על באג
                </a>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo for mobile */}
        <Link
          href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'}
          className="md:hidden flex items-center gap-2"
        >
          <img src="/icon.svg" alt="ועד בית" className="h-6 w-6" />
          <span className="font-semibold">ועד בית</span>
        </Link>

        {/* Building info - desktop only */}
        {buildingName && (
          <div className="hidden md:flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{buildingName}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>החשבון שלי</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={settingsHref}>
                <Settings className="ml-2 h-4 w-4" />
                {t('nav.settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="ml-2 h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
