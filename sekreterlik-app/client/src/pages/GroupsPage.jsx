import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../utils/ApiService';
import * as XLSX from 'xlsx';

const GroupsPage = () => {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [villages, setVillages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [neighborhoodRepresentatives, setNeighborhoodRepresentatives] = useState([]);
  const [villageRepresentatives, setVillageRepresentatives] = useState([]);
  const [neighborhoodSupervisors, setNeighborhoodSupervisors] = useState([]);
  const [villageSupervisors, setVillageSupervisors] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [towns, setTowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGroupNo, setEditingGroupNo] = useState(null);
  const [groupLeaderIds, setGroupLeaderIds] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [neighborhoodsData, villagesData, groupsData, membersData, neighborhoodRepsData, villageRepsData, neighborhoodSupsData, villageSupsData, districtsData, townsData] = await Promise.all([
        ApiService.getNeighborhoods(),
        ApiService.getVillages(),
        ApiService.getGroups(),
        ApiService.getMembers(),
        ApiService.getNeighborhoodRepresentatives(),
        ApiService.getVillageRepresentatives(),
        ApiService.getNeighborhoodSupervisors(),
        ApiService.getVillageSupervisors(),
        ApiService.getDistricts(),
        ApiService.getTowns()
      ]);

      setNeighborhoods(neighborhoodsData);
      setVillages(villagesData);
      setMembers(membersData);
      setNeighborhoodRepresentatives(neighborhoodRepsData);
      setVillageRepresentatives(villageRepsData);
      setNeighborhoodSupervisors(neighborhoodSupsData);
      setVillageSupervisors(villageSupsData);
      setDistricts(districtsData);
      setTowns(townsData);

      // Groups data - eğer yoksa boş array
      if (groupsData && Array.isArray(groupsData)) {
        setGroups(groupsData);
        // Initialize group leader IDs
        const leaderIds = {};
        groupsData.forEach(group => {
          if (group.group_no) {
            leaderIds[group.group_no] = group.group_leader_id || '';
          }
        });
        setGroupLeaderIds(leaderIds);
      } else {
        setGroups([]);
        setGroupLeaderIds({});
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group neighborhoods and villages by group_no
  const groupedData = {};
  
  neighborhoods.forEach(neighborhood => {
    if (neighborhood.group_no) {
      const groupNo = String(neighborhood.group_no);
      if (!groupedData[groupNo]) {
        groupedData[groupNo] = {
          group_no: groupNo,
          neighborhoods: [],
          villages: []
        };
      }
      groupedData[groupNo].neighborhoods.push(neighborhood);
    }
  });

  villages.forEach(village => {
    if (village.group_no) {
      const groupNo = String(village.group_no);
      if (!groupedData[groupNo]) {
        groupedData[groupNo] = {
          group_no: groupNo,
          neighborhoods: [],
          villages: []
        };
      }
      groupedData[groupNo].villages.push(village);
    }
  });

  const sortedGroupNos = Object.keys(groupedData).sort((a, b) => {
    const numA = parseInt(a) || 0;
    const numB = parseInt(b) || 0;
    return numA - numB;
  });

  const handleGroupLeaderChange = async (groupNo, memberId) => {
    try {
      setGroupLeaderIds(prev => ({
        ...prev,
        [groupNo]: memberId
      }));

      // Save to Firebase
      await ApiService.createOrUpdateGroup(groupNo, memberId || null);
      
      // Refresh groups data
      const groupsData = await ApiService.getGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Error updating group leader:', error);
      // Revert on error
      fetchData();
    }
  };

  const getGroupLeader = (groupNo) => {
    const group = groups.find(g => String(g.group_no) === String(groupNo));
    if (group && group.group_leader_id) {
      return members.find(m => String(m.id) === String(group.group_leader_id));
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/election-preparation"
            className="text-indigo-600 hover:text-indigo-800 mb-2 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Seçime Hazırlık
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Gruplar</h1>
        </div>
      </div>

      {sortedGroupNos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Henüz grup oluşturulmamış. Grup numarası atanmış mahalle ve köyler burada görünecektir.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroupNos.map(groupNo => {
            const groupData = groupedData[groupNo];
            const groupLeader = getGroupLeader(groupNo);
            const currentLeaderId = groupLeaderIds[groupNo] || (groupLeader ? groupLeader.id : '');

            return (
              <div key={groupNo} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Group Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-bold text-gray-900">Grup {groupNo}</h2>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {groupData.neighborhoods.length + groupData.villages.length} Toplam
                    </span>
                  </div>
                  
                  {/* Group Leader Selection */}
                  <div className="flex items-center space-x-4">
                    <label htmlFor={`group-leader-${groupNo}`} className="text-sm font-medium text-gray-700">
                      Grup Lideri:
                    </label>
                    <select
                      id={`group-leader-${groupNo}`}
                      value={currentLeaderId}
                      onChange={(e) => handleGroupLeaderChange(groupNo, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Grup lideri seçin</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    {groupLeader && (
                      <span className="text-sm text-gray-600">
                        Seçili: <span className="font-medium">{groupLeader.name}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Neighborhoods Table */}
                {groupData.neighborhoods.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Mahalleler ({groupData.neighborhoods.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mahalle Adı</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İlçe</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Belde</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temsilci</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temsilci Telefon</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müfettiş</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müfettiş Telefon</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupData.neighborhoods.map(neighborhood => {
                            const representative = neighborhoodRepresentatives.find(rep => String(rep.neighborhood_id) === String(neighborhood.id));
                            const supervisor = neighborhoodSupervisors.find(sup => String(sup.neighborhood_id) === String(neighborhood.id));
                            const district = districts.find(d => String(d.id) === String(neighborhood.district_id));
                            const town = neighborhood.town_id ? towns.find(t => String(t.id) === String(neighborhood.town_id)) : null;
                            
                            return (
                              <tr key={neighborhood.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{neighborhood.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{district?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{town?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{representative?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{representative?.phone || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{supervisor?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{supervisor?.phone || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Villages Table */}
                {groupData.villages.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Köyler ({groupData.villages.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Köy Adı</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İlçe</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Belde</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temsilci</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temsilci Telefon</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müfettiş</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müfettiş Telefon</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupData.villages.map(village => {
                            const representative = villageRepresentatives.find(rep => String(rep.village_id) === String(village.id));
                            const supervisor = villageSupervisors.find(sup => String(sup.village_id) === String(village.id));
                            const district = districts.find(d => String(d.id) === String(village.district_id));
                            const town = village.town_id ? towns.find(t => String(t.id) === String(village.town_id)) : null;
                            
                            return (
                              <tr key={village.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{village.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{district?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{town?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{representative?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{representative?.phone || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{supervisor?.name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{supervisor?.phone || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;

