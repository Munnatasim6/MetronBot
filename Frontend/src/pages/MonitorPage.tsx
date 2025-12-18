import React from 'react';
import DashboardPanel from '../components/Panels/DashboardPanel';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import SEO from '../components/common/SEO';

const MonitorPage: React.FC = () => {
  const {
    metrics,
    positions,
    logs,
    logFilter,
    setLogFilter,
    clearLogs,
    closePosition,
    closeAllPositions,
    updatePositionSize,
  } = useAppStore();

  const { riskConfig } = useSettingsStore();

  return (
    <>
      <SEO title='Monitor' description='Real-time system monitoring' />
      <DashboardPanel
        metrics={metrics}
        positions={positions}
        riskConfig={riskConfig}
        logs={logs}
        logFilter={logFilter}
        setLogFilter={setLogFilter}
        clearLogs={clearLogs}
        onClosePosition={closePosition}
        onCloseAllPositions={closeAllPositions}
        onEditPosition={(pos) => {
          const newSize = prompt(`Update size for ${pos.pair}`, pos.size.toString());
          if (newSize) {
            const size = parseFloat(newSize);
            if (!isNaN(size)) {
              updatePositionSize(pos.id, size);
            }
          }
        }}
      />
    </>
  );
};

export default MonitorPage;
