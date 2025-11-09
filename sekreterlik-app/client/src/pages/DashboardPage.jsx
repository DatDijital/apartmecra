import React, { useState, useEffect } from 'react';
import ApiService from '../utils/ApiService';
import { 
  DashboardHeader, 
  DashboardStatsCards, 
  TopRegistrarsTable, 
  TopAttendeesTable 
} from '../components/Dashboard';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMeetings: 0,
    avgAttendanceRate: 0
  });
  
  const [topRegistrars, setTopRegistrars] = useState([]);
  const [topAttendees, setTopAttendees] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data
      const [members, meetings, events, memberRegistrations] = await Promise.all([
        ApiService.getMembers(),
        ApiService.getMeetings(),
        ApiService.getEvents(),
        ApiService.getMemberRegistrations()
      ]);
      
      // Calculate total members
      const totalMembers = members.length;
      
      // Calculate total meetings
      const totalMeetings = meetings.length;
      
      // Calculate average attendance rate
      let totalAttendanceRate = 0;
      let validMeetings = 0;
      
      meetings.forEach(meeting => {
        if (meeting.attendees && meeting.attendees.length > 0) {
          const totalExpected = meeting.attendees.length;
          const attendedCount = meeting.attendees.filter(a => a.attended).length;
          const attendanceRate = (attendedCount / totalExpected) * 100;
          totalAttendanceRate += attendanceRate;
          validMeetings++;
        }
      });
      
      const avgAttendanceRate = validMeetings > 0 ? (totalAttendanceRate / validMeetings) : 0;
      
      // Set stats
      setStats({
        totalMembers,
        totalMeetings,
        avgAttendanceRate: Math.round(avgAttendanceRate)
      });
      
      // Calculate top 3 registrars (members with most registrations)
      const memberRegistrationCounts = {};
      members.forEach(member => {
        memberRegistrationCounts[member.id] = {
          member,
          count: 0
        };
      });
      
      memberRegistrations.forEach(reg => {
        if (memberRegistrationCounts[reg.memberId]) {
          memberRegistrationCounts[reg.memberId].count += reg.count;
        }
      });
      
      const sortedRegistrars = Object.values(memberRegistrationCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      setTopRegistrars(sortedRegistrars);
      
      // Calculate top 3 attendees (members with most meeting attendances)
      const memberAttendanceCounts = {};
      members.forEach(member => {
        memberAttendanceCounts[member.id] = {
          member,
          count: 0
        };
      });
      
      meetings.forEach(meeting => {
        if (meeting.attendees) {
          meeting.attendees.forEach(attendee => {
            if (attendee.attended && memberAttendanceCounts[attendee.memberId]) {
              memberAttendanceCounts[attendee.memberId].count += 1;
            }
          });
        }
      });
      
      const sortedAttendees = Object.values(memberAttendanceCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      setTopAttendees(sortedAttendees);
      
      // Get upcoming events and meetings (next 7 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const upcomingEventsList = events
        .filter(event => {
          if (!event.date || event.archived) return false;
          try {
            let eventDate;
            if (event.date.includes('T')) {
              eventDate = new Date(event.date);
            } else if (event.date.includes('.')) {
              const [day, month, year] = event.date.split('.');
              eventDate = new Date(year, month - 1, day);
            } else {
              eventDate = new Date(event.date);
            }
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today && eventDate <= nextWeek;
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const dateA = a.date.includes('T') ? new Date(a.date) : new Date(a.date.split('.').reverse().join('-'));
            const dateB = b.date.includes('T') ? new Date(b.date) : new Date(b.date.split('.').reverse().join('-'));
            return dateA - dateB;
          } catch (e) {
            return 0;
          }
        })
        .slice(0, 5);
      
      const upcomingMeetingsList = meetings
        .filter(meeting => {
          if (!meeting.date || meeting.archived) return false;
          try {
            let meetingDate;
            if (meeting.date.includes('T')) {
              meetingDate = new Date(meeting.date);
            } else if (meeting.date.includes('.')) {
              const [day, month, year] = meeting.date.split('.');
              meetingDate = new Date(year, month - 1, day);
            } else {
              meetingDate = new Date(meeting.date);
            }
            meetingDate.setHours(0, 0, 0, 0);
            return meetingDate >= today && meetingDate <= nextWeek;
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const dateA = a.date.includes('T') ? new Date(a.date) : new Date(a.date.split('.').reverse().join('-'));
            const dateB = b.date.includes('T') ? new Date(b.date) : new Date(b.date.split('.').reverse().join('-'));
            return dateA - dateB;
          } catch (e) {
            return 0;
          }
        })
        .slice(0, 5);
      
      setUpcomingEvents(upcomingEventsList);
      setUpcomingMeetings(upcomingMeetingsList);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6">
        <DashboardHeader />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <DashboardHeader />

      {/* Stats Cards */}
      <DashboardStatsCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Registrars */}
        <TopRegistrarsTable topRegistrars={topRegistrars} />

        {/* Top Attendees */}
        <TopAttendeesTable topAttendees={topAttendees} />
      </div>

      {/* Upcoming Events and Meetings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mt-6">
        {/* Upcoming Events */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Yaklaşan Etkinlikler</h3>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{event.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.date && (
                          <span>
                            {event.date.includes('T') 
                              ? new Date(event.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : event.date}
                          </span>
                        )}
                      </p>
                      {event.location && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">📍 {event.location}</p>
                      )}
                    </div>
                    {event.isPlanned && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        Planlandı
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Yaklaşan etkinlik bulunmuyor</p>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Yaklaşan Toplantılar</h3>
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{meeting.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {meeting.date && (
                          <span>
                            {meeting.date.includes('T') 
                              ? new Date(meeting.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : meeting.date}
                          </span>
                        )}
                      </p>
                      {meeting.regions && meeting.regions.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          📍 {meeting.regions.join(', ')}
                        </p>
                      )}
                    </div>
                    {meeting.isPlanned && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        Planlandı
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Yaklaşan toplantı bulunmuyor</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;