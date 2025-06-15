import { useState, ReactNode } from 'react';
import { Box, Paper, Tabs, Tab } from '@mui/material';

export interface TabItem {
  label: string;
  content: ReactNode;
}

interface TabsContainerProps {
  tabs: TabItem[];
  defaultTab?: number;
  variant?: 'fullWidth' | 'standard' | 'scrollable';
  collapsed?: boolean;
  sx?: any;
}

const TabsContainer = ({tabs, defaultTab = 0, variant = 'fullWidth', collapsed = false, sx }: TabsContainerProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      {!collapsed && (
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} variant={variant} sx={{ borderBottom: 1, height: '13%', borderColor: 'divider' }}
        >
          {tabs.map((tab, index) => (
            <Tab  key={index} label={tab.label}   sx={{ height: '90px' }} />
          ))}
        </Tabs>
      )}

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {!collapsed && tabs[activeTab]?.content}
      </Box>
    </Paper>
  );
};

export default TabsContainer;