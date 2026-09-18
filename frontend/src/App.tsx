import React, { useState } from 'react';
import { Chat } from './components/Chat';
import Dashboard from './components/Dashboard';
import { FarmGISPage } from './components/FarmGIS/FarmGISPage';
import { FarmFieldChooser } from './components/FarmGIS/FarmFieldChooser';
import { WeatherDashboard } from './components/Weather/WeatherDashboard';
import { SoilAnalysisModule } from './components/Soil/SoilAnalysisModule';
import { YieldPredictionModule } from './components/Yield/YieldPredictionModule';
import { DiseaseRiskModule } from './components/Disease/DiseaseRiskModule';
import { FertilizerPesticideModule } from './components/Inventory/FertilizerPesticideModule';
import { HarvestManagementModule } from './components/Harvest/HarvestManagementModule';
import { CropPriceModule } from './components/CropPrice/CropPriceModule';
import { FarmAnalyticsDashboard } from './components/Analytics/FarmAnalyticsDashboard';
import { FarmData, farmService } from './services/farmService';
import { OfficerLogin } from './components/OfficerLogin';
import { OfficerDashboard } from './components/OfficerDashboard';
import { AuthWrapper } from './components/AuthWrapper';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SmartAlertsCenter } from './components/Alerts/SmartAlertsCenter';
import { LiveAlertToast } from './components/Alerts/LiveAlertToast';
import { alertService } from './services/alertService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navigation/Navbar';
import { Sprout, MessageSquare, Shield, LogOut, User, MapPin, CloudSun, FlaskConical, Brain, Bug, Pill, Tractor, IndianRupee, BarChart3, Bell, ArrowLeft } from 'lucide-react';

type LocationData = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  state?: string;
  district?: string;
};

const DEFAULT_LOCATION: LocationData = {
  latitude: 28.6692,
  longitude: 77.4538,
  city: 'Ghaziabad',
  country: 'India',
  state: 'Uttar Pradesh',
  district: 'Ghaziabad'
};

const DEFAULT_CROP = 'Rice';

const DEMO_FARM: FarmData = {
  farm_id: 'farm_demo_ghaziabad',
  farm_name: 'Ghaziabad Model Rice Field',
  farmer_id: 'demo_farmer',
  crop: 'Rice',
  season: 'Kharif',
  latitude: 28.6692,
  longitude: 77.4538,
  area_hectares: 2.4,
  area_acres: 5.93,
  location_name: 'Ghaziabad, Uttar Pradesh, India',
  soil_type: 'Clay Loam',
  irrigation_type: 'Canal & Tube Well'
};

function AppContent() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('agrisense_token');
    } catch {
      return null;
    }
  });
  const [view, setView] = useState<string>(() => {
    try {
      const active = localStorage.getItem('agrisense_active_farm');
      if (active) return 'dashboard';
      const saved = localStorage.getItem('agrisense_saved_farms');
      if (saved && JSON.parse(saved).length > 0) return 'dashboard';
    } catch {}
    return 'field-chooser';
  });
  const [previousView, setPreviousView] = useState<string>('dashboard');

  const navigateTo = (newView: string) => {
    setView(prev => {
      if (prev !== newView && prev !== 'chat') {
        setPreviousView(prev);
      }
      return newView;
    });
  };
  const [gisInitialTab, setGisInitialTab] = useState<'saved-fields' | 'new-field' | undefined>(undefined);
  const [activeFarm, setActiveFarm] = useState<FarmData | null>(() => {
    try {
      const active = localStorage.getItem('agrisense_active_farm');
      if (active) return JSON.parse(active);
      const saved = localStorage.getItem('agrisense_saved_farms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
    } catch {}
    return null;
  });
  const [dashboardData, setDashboardData] = useState<{
    location: LocationData;
    crop: string;
    farmDetails?: FarmData;
  } | null>(null);
  const { user, logout, isGuest } = useAuth();
  const { t } = useLanguage();

  // Load user farms if activeFarm is not set
  React.useEffect(() => {
    if (isGuest) {
      if (!activeFarm) {
        setActiveFarm(DEMO_FARM);
      }
      return;
    }
    farmService.getFarms(user?.id || 'default_farmer').then(farms => {
      if (Array.isArray(farms) && farms.length > 0) {
        setActiveFarm(prev => {
          if (prev) return prev;
          try {
            localStorage.setItem('agrisense_active_farm', JSON.stringify(farms[0]));
          } catch {}
          return farms[0];
        });
      }
    }).catch(err => console.warn('Could not auto-load farms in App:', err));
  }, [user, isGuest]);

  // Role-based direct routing on authentication
  React.useEffect(() => {
    if (user) {
      if (user.role === 'officer') {
        const storedToken = localStorage.getItem('agrisense_token');
        if (storedToken) setToken(storedToken);
        setView('officer');
      } else if (isGuest) {
        if (!activeFarm) {
          setActiveFarm(DEMO_FARM);
        }
        if (view === 'home' || view === 'officer') {
          setView('dashboard');
        }
      } else {
        // Authenticated Farmer: land on dashboard if farm exists, else field-chooser
        if (view === 'home' || view === 'officer') {
          setView(activeFarm ? 'dashboard' : 'field-chooser');
        }
      }
    }
  }, [user, isGuest]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const currentLocation = dashboardData?.location || (activeFarm ? {
    latitude: activeFarm.latitude,
    longitude: activeFarm.longitude,
    city: activeFarm.location_name,
    country: 'India'
  } : DEFAULT_LOCATION);

  const currentCrop = dashboardData?.crop || activeFarm?.crop || DEFAULT_CROP;

  React.useEffect(() => {
    const handleAlertsUpdate = (e: any) => {
      if (e.detail && typeof e.detail.unreadCount === 'number') {
        setUnreadAlertCount(e.detail.unreadCount);
      }
    };
    window.addEventListener('agrisense:alerts-updated', handleAlertsUpdate);

    const loadAlerts = async () => {
      try {
        const farmId = activeFarm?.farm_id || (activeFarm as any)?.id || 'farm_01';
        const farmName = activeFarm?.farm_name || (activeFarm as any)?.name || 'Ghaziabad Rice Field';
        const telemetry = {
          farm: { id: farmId, name: farmName, crop: currentCrop },
          weather: { temperature_c: 34, humidity: 76, wind_speed_kmh: 18, rain_mm: 12 },
          soil: { moisture: 24, ph: 5.4 },
          disease: { riskScore: 82, name: 'Rice Blast & Sheath Rot' },
          gdd: { progressPercentage: 82, currentStage: 'Grain Filling Stage' },
          yieldData: { predictedYield: 4.5, historicalAvgYield: 5.5 }
        };
        const alerts = await alertService.evaluateTelemetry(telemetry);
        setUnreadAlertCount(alerts.filter(a => a.status === 'unread').length);
      } catch (e) {}
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('agrisense:alerts-updated', handleAlertsUpdate);
    };
  }, [activeFarm, dashboardData, currentCrop]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSelectFarmFromGIS = (farm: FarmData) => {
    setActiveFarm(farm);
    try {
      localStorage.setItem('agrisense_active_farm', JSON.stringify(farm));
    } catch {}
    setDashboardData({
      location: {
        latitude: farm.latitude,
        longitude: farm.longitude,
        city: farm.location_name,
        country: 'India'
      },
      crop: farm.crop,
      farmDetails: farm
    });
    setView('dashboard');
  };

  const handleBackToChooser = () => {
    setView('field-chooser');
  };

  return (
    <div className="min-h-screen agri-canvas text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Background ambient lighting effects for luminous cyber-glass look */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Sleek Modern Application Navbar */}
      <Navbar
        currentView={view}
        onSelectView={navigateTo}
        unreadAlertCount={unreadAlertCount}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1">
        <ErrorBoundary>
          {(view === 'field-chooser' || view === 'home') && (
            <FarmFieldChooser
              onViewSavedFields={() => {
                setGisInitialTab('saved-fields');
                setView('gis');
              }}
              onOpenGISMap={() => {
                setGisInitialTab('new-field');
                setView('gis');
              }}
              onSelectFarm={handleSelectFarmFromGIS}
              activeFarmId={activeFarm?.farm_id}
              onGoToDashboard={() => setView('dashboard')}
            />
          )}
          {view === 'gis' && (
            <FarmGISPage
              onSelectFarmForDashboard={handleSelectFarmFromGIS}
              onGoToDashboard={() => setView('dashboard')}
              initialTab={gisInitialTab}
            />
          )}
          {view === 'analytics' && (
            <FarmAnalyticsDashboard
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'yield' && (
            <YieldPredictionModule
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'harvest' && (
            <HarvestManagementModule
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'prices' && (
            <CropPriceModule
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'disease' && (
            <DiseaseRiskModule
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'inventory' && (
            <FertilizerPesticideModule
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'soil' && (
            <SoilAnalysisModule
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'weather' && (
            <WeatherDashboard
              farm={activeFarm}
              location={currentLocation}
              crop={currentCrop}
            />
          )}
          {view === 'dashboard' && (
            <Dashboard 
              location={currentLocation}
              crop={currentCrop}
              farmDetails={dashboardData?.farmDetails || activeFarm || undefined}
              onBack={handleBackToChooser}
            />
          )}
          {view === 'chat' && (
            <div className="px-4 py-8">
              <div className="max-w-5xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setView(previousView && previousView !== 'chat' ? previousView : 'dashboard')}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0D1612]/90 hover:bg-emerald-950/70 border border-emerald-900/50 hover:border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-medium transition-all shadow-sm cursor-pointer group"
                    title="Return to Previous Screen"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to {previousView === 'field-chooser' ? 'Farm Chooser' : previousView === 'gis' ? 'GIS Map' : 'Dashboard'}</span>
                  </button>
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Agronomist Advisor Live
                  </span>
                </div>
                <Chat
                  activeFarm={activeFarm}
                  location={currentLocation}
                  crop={currentCrop}
                  onBack={() => setView(previousView && previousView !== 'chat' ? previousView : 'dashboard')}
                />
              </div>
            </div>
          )}
          {view === 'officer' && (
            <div className="px-2 sm:px-4 py-6">
              <div className="max-w-7xl mx-auto">
                {token ? (
                  <OfficerDashboard token={token} onLogout={() => setToken(null)} />
                ) : (
                  <div className="max-w-md mx-auto py-6">
                    <OfficerLogin onToken={(t) => setToken(t)} />
                  </div>
                )}
              </div>
            </div>
          )}
        </ErrorBoundary>
      </main>
      <SmartAlertsCenter
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onNavigateModule={navigateTo}
        activeFarmId={activeFarm?.farm_id || (activeFarm as any)?.id || 'farm_01'}
        isOfficer={user?.role === 'officer' || user?.role === 'admin'}
      />
      <LiveAlertToast
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onNavigateModule={navigateTo}
      />
      <footer className="border-t border-emerald-900/30 bg-[#070D0A]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-5 text-sm text-[#D1DED6] flex items-center justify-between">
          <span>© {new Date().getFullYear()} AgriSense Precision Agronomic Suite</span>
          <span className="text-emerald-400 font-semibold">Verified for Indian Precision Agriculture</span>
        </div>
      </footer>
    </div>
  );
}

export const App = () => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AuthWrapper>
            <AppContent />
          </AuthWrapper>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
};
