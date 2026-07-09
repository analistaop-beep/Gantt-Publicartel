import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sileo';
import { Sidebar } from './components/Sidebar';
import { NotificationsSidebar } from './components/NotificationsSidebar';
import { ChevronLeft, ChevronRight, Loader2, Bell } from 'lucide-react';
import { LoginPage } from './pages/LoginPage';
import { useStore } from './store/useStore';

// Lazy load pages for better performance
const MembersPage = lazy(() => import('./pages/MembersPage').then(m => ({ default: m.MembersPage })));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage').then(m => ({ default: m.VehiclesPage })));
const GanttPage = lazy(() => import('./pages/GanttPage').then(m => ({ default: m.GanttPage })));
const HerreriaPage = lazy(() => import('./pages/HerreriaPage').then(m => ({ default: m.HerreriaPage })));
const CorporeasPage = lazy(() => import('./pages/CorporeasPage').then(m => ({ default: m.CorporeasPage })));
const LonasVinilosPage = lazy(() => import('./pages/LonasVinilosPage').then(m => ({ default: m.LonasVinilosPage })));
const PinturaPage = lazy(() => import('./pages/PinturaPage').then(m => ({ default: m.PinturaPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })));

const LoadingView = () => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 gap-4">
    <Loader2 className="text-blue-500 animate-spin" size={40} />
    <p className="text-slate-400 font-medium animate-pulse">Cargando sección...</p>
  </div>
);

function App() {
  const user = useStore(state => state.user);
  const isAuthLoading = useStore(state => state.isAuthLoading);
  const initAuth = useStore(state => state.initAuth);

  const [activeTab, setActiveTab] = useState('gantt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [pendingOpenOrderId, setPendingOpenOrderId] = useState<string | null>(null);
  const [pendingOpenOrderNumber, setPendingOpenOrderNumber] = useState<string | null>(null);
  const fetchData = useStore(state => state.fetchData);
  const subscribeToChanges = useStore(state => state.subscribeToChanges);
  const hasPendingChanges = useStore(state => state.hasPendingChanges);
  const saveAllChanges = useStore(state => state.saveAllChanges);
  const isLoading = useStore(state => state.isLoading);
  const isSaving = useStore(state => state.isSaving);
  
  const notifications = useStore(state => state.notifications);
  const readNotifications = useStore(state => state.readNotifications);
  const unreadCount = notifications.filter(n => !readNotifications.includes(n.id)).length;

  const handleNotificationClick = (notification: any) => {
    // Intentar por opId directo
    const opId = notification.opId || null;
    // Fallback: opNumber del campo, o extraído del título (ej: "Nueva OP #12345 — Cliente")
    let opNumber = notification.opNumber || null;
    if (!opNumber && notification.title) {
      const match = notification.title.match(/OP #(\S+)/);
      if (match) opNumber = match[1].replace(/—.*/, '').trim();
    }

    if (opId || opNumber) {
      setActiveTab('orders');
      setPendingOpenOrderId(opId);
      setPendingOpenOrderNumber(opNumber);
      if (window.innerWidth <= 1024) setIsRightSidebarOpen(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (user) {
      fetchData();
      // Activate Realtime synchronization
      const unsubscribe = subscribeToChanges();
      return () => unsubscribe();
    }
  }, [fetchData, subscribeToChanges, user]);

  // Auto-save when the user hides the tab or closes the window
  useEffect(() => {
    const handleAutoSave = () => {
      if (hasPendingChanges) {
        saveAllChanges();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleAutoSave();
      }
    };

    window.addEventListener('pagehide', handleAutoSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handleAutoSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasPendingChanges, saveAllChanges]);



  const renderContent = () => {
    return (
      <Suspense fallback={<LoadingView />}>
        {(() => {
          switch (activeTab) {
            case 'members': return <MembersPage />;
            case 'vehicles': return <VehiclesPage />;
            case 'gantt': return <GanttPage />;
            case 'herreria': return <HerreriaPage />;
            case 'corporeas': return <CorporeasPage />;
            case 'lonas': return <LonasVinilosPage />;
            case 'pintura': return <PinturaPage />;
            case 'orders': return <OrdersPage openOrderId={pendingOpenOrderId} openOrderNumber={pendingOpenOrderNumber} onOpenOrderIdConsumed={() => { setPendingOpenOrderId(null); setPendingOpenOrderNumber(null); }} />;
            default: return <GanttPage />;
          }
        })()}
      </Suspense>
    );
  };

  if (isAuthLoading) {
    return <LoadingView />;
  }

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <Toaster options={{ duration: 2000 }} />
      </div>
      {(isLoading || isSaving) && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900/90 text-blue-400 px-4 py-2 rounded-full border border-blue-500/30 flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-md pointer-events-none">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {isSaving ? 'Guardando...' : 'Sincronizando...'}
          </span>
        </div>
      )}
      {!user ? (
        <LoginPage />
      ) : (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans relative">

      <div className={`transition-all duration-300 ease-in-out fixed lg:relative inset-y-0 left-0 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-0 lg:translate-x-0'} overflow-hidden h-full flex-shrink-0 z-[60] lg:z-40 shadow-2xl shadow-black/50`}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
          setActiveTab(tab);
          if (window.innerWidth <= 1024) setIsSidebarOpen(false);
        }} />
      </div>

      {/* Backdrop for Left Sidebar on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Elegant Sidebar Handle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-[45] w-5 h-16 glass rounded-r-lg border-l-0 flex items-center justify-center hover:bg-white/10 transition-all duration-300 group shadow-2xl backdrop-blur-2xl border border-white/10 ${isSidebarOpen ? 'left-64 hidden lg:flex' : 'left-0'}`}
        title={isSidebarOpen ? "Ocultar Sidebar" : "Mostrar Sidebar"}
      >
        {isSidebarOpen ? (
          <ChevronLeft size={14} className="text-slate-500 group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight size={14} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
        )}
      </button>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className={`flex-1 min-h-0 ${['gantt', 'herreria', 'corporeas', 'lonas', 'pintura', 'members', 'vehicles', 'orders'].includes(activeTab) ? '' : 'p-4 md:p-8 overflow-auto'} transition-all duration-300`}>
          {renderContent()}
        </div>
      </main>

      {/* Right Sidebar (Notifications) */}
      <div className={`transition-all duration-300 ease-in-out fixed lg:relative inset-y-0 right-0 ${isRightSidebarOpen ? 'w-64 translate-x-0' : 'w-64 translate-x-full lg:w-0 lg:translate-x-0'} overflow-hidden h-full flex-shrink-0 z-[60] lg:z-40 shadow-2xl shadow-black/50`}>
        <NotificationsSidebar onNotificationClick={handleNotificationClick} />
      </div>

      {/* Backdrop for Right Sidebar on Mobile */}
      {isRightSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsRightSidebarOpen(false)}
        />
      )}

      {/* Elegant Right Sidebar Handle */}
      <button
        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-[45] w-6 h-20 glass rounded-l-lg border-r-0 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all duration-300 group shadow-2xl backdrop-blur-2xl border border-white/10 ${isRightSidebarOpen ? 'right-64 hidden lg:flex' : 'right-0'}`}
        title={isRightSidebarOpen ? "Ocultar Notificaciones" : "Mostrar Notificaciones"}
      >
        {unreadCount > 0 && !isRightSidebarOpen && (
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse shadow-lg shadow-red-500/50" />
        )}
        {isRightSidebarOpen ? (
          <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
        ) : (
          <ChevronLeft size={14} className={unreadCount > 0 ? "text-red-400" : "text-blue-400 group-hover:text-blue-300 transition-colors"} />
        )}
        <Bell size={12} className={`opacity-50 ${unreadCount > 0 && !isRightSidebarOpen ? 'text-red-400 animate-[wiggle_1s_ease-in-out_infinite] opacity-100' : 'text-slate-500'}`} />
      </button>
    </div>
      )}
    </>
  );
}

export default App;
