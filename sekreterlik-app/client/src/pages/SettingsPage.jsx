import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AdminSettings from '../components/AdminSettings';
import RegionsSettings from '../components/RegionsSettings';
import PositionsSettings from '../components/PositionsSettings';
import MemberUsersSettings from '../components/MemberUsersSettings';
import DistrictsSettings from '../components/DistrictsSettings';
import TownsSettings from '../components/TownsSettings';
import NeighborhoodsSettings from '../components/NeighborhoodsSettings';
import VillagesSettings from '../components/VillagesSettings';
import STKSettings from '../components/STKSettings';
import MosquesSettings from '../components/MosquesSettings';
import EventCategoriesSettings from '../components/EventCategoriesSettings';
import AuthorizationSettings from '../components/AuthorizationSettings';
import { 
  SettingsHeader, 
  SettingsSummaryCards, 
  SettingsTabs 
} from '../components/Settings';

const SettingsPage = ({ tab }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('admin');
  const isSTKManagement = searchParams.get('tab') === 'stks' || tab === 'stks';

  useEffect(() => {
    if (isSTKManagement) {
      setActiveTab('stks');
    }
  }, [isSTKManagement]);

  return (
    <div className="py-6">
      {/* Header Section */}
      {isSTKManagement ? (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">STK Yönetimi</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">STK ekleme, düzenleme ve silme işlemleri</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">STK Birim Başkanı</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <SettingsHeader />
          <SettingsSummaryCards />
          <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      )}

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6">
          {activeTab === 'admin' && <AdminSettings />}
          {activeTab === 'regions' && <RegionsSettings />}
          {activeTab === 'positions' && <PositionsSettings />}
          {activeTab === 'member-users' && <MemberUsersSettings />}
          {activeTab === 'districts' && <DistrictsSettings />}
          {activeTab === 'towns' && <TownsSettings />}
          {activeTab === 'neighborhoods' && <NeighborhoodsSettings />}
          {activeTab === 'villages' && <VillagesSettings />}
          {activeTab === 'stks' && <STKSettings />}
          {activeTab === 'mosques' && <MosquesSettings />}
          {activeTab === 'event-categories' && <EventCategoriesSettings />}
          {activeTab === 'authorization' && <AuthorizationSettings />}
          {/* Push notifications removed */}
          
          {/* Firebase Auth Users Link */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/firebase-auth-users"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Firebase Auth Kullanıcılarını Kontrol Et
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;