import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import HomeDashboardPanel from '../components/Panels/HomeDashboardPanel';
import { useAppStore } from '../store/useAppStore';
import { APP_MODULES } from '../constants';
import { SystemStatus } from '../types';
import SEO from '../components/common/SEO';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, metrics, positions, setStatus, addLog, soundEnabled } = useAppStore();

  const handleKillSwitch = () => {
    setStatus(SystemStatus.STOPPED);
    addLog('ALERT', 'Kill Switch Activated via Dashboard');
  };

  return (
    <>
      <SEO title={t('dashboard.title')} description='Metron Trading Dashboard overview' />
      <HomeDashboardPanel
        onNavigate={(id) => navigate(`/${id}`)}
        onKillSwitch={handleKillSwitch}
        status={status}
        metrics={metrics}
        activePositionsCount={positions.length}
        modules={APP_MODULES.map((mod) => {
          if (mod.id === 'dashboard') return { ...mod, label: t('dashboard.title') };
          if (mod.id === 'monitor') return { ...mod, label: t('dashboard.monitor') };
          if (mod.id === 'master_config') return { ...mod, label: t('dashboard.master_config') };
          return mod;
        })}
      />
    </>
  );
};

export default DashboardPage;
