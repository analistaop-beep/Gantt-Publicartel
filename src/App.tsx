import { useState, useEffect } from 'react';
import { Toaster } from 'sileo';
import { Sidebar } from './components/Sidebar';
import { MembersSidebar } from './components/MembersSidebar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MembersPage } from './pages/MembersPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { GanttPage } from './pages/GanttPage';
import { HerreriaPage } from './pages/HerreriaPage';
import { CorporeasPage } from './pages/CorporeasPage';
import { LonasVinilosPage } from './pages/LonasVinilosPage';
import { PinturaPage } from './pages/PinturaPage';
import { LoginPage } from './pages/LoginPage';
import { useStore } from './store/useStore';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [activeTab, setActiveTab] = useState('gantt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const fetchData = useStore(state => state.fetchData);
  // error state is still in store, but we'll use sileo for display if possible

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated]);

  const renderContent = () => {
    switch (activeTab) {
      case 'members': return <MembersPage />;
      case 'vehicles': return <VehiclesPage />;
      case 'gantt': return <GanttPage />;
      case 'herreria': return <HerreriaPage />;
      case 'corporeas': return <CorporeasPage />;
      case 'lonas': return <LonasVinilosPage />;
      case 'pintura': return <PinturaPage />;
      default: return <GanttPage />;
    }
  };

  return (
    <>
      <Toaster />
      {!isAuthenticated ? (
        <LoginPage onLogin={() => setIsAuthenticated(true)} />
      ) : (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans relative">

      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden h-full flex-shrink-0 z-40 relative shadow-2xl shadow-black/50`}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Elegant Sidebar Handle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{ left: isSidebarOpen ? '256px' : '0px' }}
        className="absolute top-1/2 -translate-y-1/2 z-50 w-5 h-16 glass rounded-r-2xl border-l-0 flex items-center justify-center hover:bg-white/10 transition-all duration-300 group shadow-2xl backdrop-blur-2xl border border-white/10"
        title={isSidebarOpen ? "Ocultar Sidebar" : "Mostrar Sidebar"}
      >
        {isSidebarOpen ? (
          <ChevronLeft size={14} className="text-slate-500 group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight size={14} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
        )}
      </button>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className={`flex-1 min-h-0 ${['gantt', 'herreria', 'corporeas', 'lonas', 'pintura', 'members', 'vehicles'].includes(activeTab) ? '' : 'p-8 overflow-auto'} transition-all duration-300`}>
          {renderContent()}
        </div>
      </main>

      {/* Right Sidebar */}
      <div className={`transition-all duration-300 ease-in-out ${isRightSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden h-full flex-shrink-0 z-40 relative shadow-2xl shadow-black/50`}>
        <MembersSidebar />
      </div>

      {/* Elegant Right Sidebar Handle */}
      <button
        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        style={{ right: isRightSidebarOpen ? '256px' : '0px' }}
        className="absolute top-1/2 -translate-y-1/2 z-50 w-5 h-16 glass rounded-l-2xl border-r-0 flex items-center justify-center hover:bg-white/10 transition-all duration-300 group shadow-2xl backdrop-blur-2xl border border-white/10"
        title={isRightSidebarOpen ? "Ocultar Integrantes" : "Mostrar Integrantes"}
      >
        {isRightSidebarOpen ? (
          <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
        ) : (
          <ChevronLeft size={14} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
        )}
      </button>
    </div>
      )}
    </>
  );
}

export default App;
