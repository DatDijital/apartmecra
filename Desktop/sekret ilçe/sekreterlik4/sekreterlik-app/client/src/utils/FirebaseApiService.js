import FirebaseService from '../services/FirebaseService';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Firebase tabanlı API Service
 * Mevcut ApiService ile uyumlu interface sağlar
 * Tüm veriler Firestore'da şifrelenmiş olarak saklanır
 */
class FirebaseApiService {
  // Use Firebase flag
  static useFirebase = true;

  // Collection names mapping
  static COLLECTIONS = {
    MEMBERS: 'members',
    MEETINGS: 'meetings',
    EVENTS: 'events',
    TASKS: 'tasks',
    ADMIN: 'admin',
    MEMBER_USERS: 'member_users',
    REGIONS: 'regions',
    POSITIONS: 'positions',
    DISTRICTS: 'districts',
    TOWNS: 'towns',
    NEIGHBORHOODS: 'neighborhoods',
    VILLAGES: 'villages',
    MESSAGES: 'messages',
    MESSAGE_GROUPS: 'message_groups',
    PERSONAL_DOCUMENTS: 'personal_documents',
    ARCHIVE: 'archive'
  };

  // Auth API
  static async login(username, password) {
    try {
      // Firebase Auth ile giriş yap
      // Email formatına çevir (username@domain.com)
      const email = username.includes('@') ? username : `${username}@ilsekreterlik.local`;
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Admin bilgilerini kontrol et
      const adminDoc = await FirebaseService.getById(this.COLLECTIONS.ADMIN, 'main');
      
      // User bilgisini hazırla
      const userData = {
        id: user.uid,
        username: username,
        email: user.email,
        type: 'admin', // veya member_users'dan kontrol edilebilir
        memberId: null
      };

      // Member user ise ek bilgileri getir
      const memberUser = await FirebaseService.findByField(
        this.COLLECTIONS.MEMBER_USERS,
        'username',
        username
      );

      if (memberUser && memberUser.length > 0) {
        userData.type = memberUser[0].userType || 'member';
        userData.memberId = memberUser[0].memberId;
        userData.id = memberUser[0].id;
      }

      return {
        success: true,
        user: userData,
        message: 'Giriş başarılı'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message === 'auth/user-not-found' || error.message === 'auth/wrong-password'
          ? 'Kullanıcı adı veya şifre hatalı'
          : 'Giriş yapılırken hata oluştu'
      };
    }
  }

  static async logout() {
    try {
      await signOut(auth);
      return { success: true, message: 'Çıkış başarılı' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Çıkış yapılırken hata oluştu' };
    }
  }

  // Admin API
  static async getAdminInfo() {
    try {
      const admin = await FirebaseService.getById(this.COLLECTIONS.ADMIN, 'main');
      return admin || { success: false, message: 'Admin bulunamadı' };
    } catch (error) {
      console.error('Get admin info error:', error);
      return { success: false, message: 'Admin bilgileri alınırken hata oluştu' };
    }
  }

  static async updateAdminCredentials(username, password, currentPassword) {
    try {
      // Mevcut şifre ile re-authenticate
      const user = auth.currentUser;
      if (!user || !user.email) {
        return { success: false, message: 'Kullanıcı oturumu bulunamadı' };
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Şifreyi güncelle
      if (password) {
        await updatePassword(user, password);
      }

      // Admin bilgilerini güncelle
      await FirebaseService.update(this.COLLECTIONS.ADMIN, 'main', { username });

      return { success: true, message: 'Admin bilgileri güncellendi' };
    } catch (error) {
      console.error('Update admin credentials error:', error);
      return { success: false, message: 'Admin bilgileri güncellenirken hata oluştu' };
    }
  }

  // Member Users API
  static async getMemberUsers() {
    try {
      const users = await FirebaseService.getAll(this.COLLECTIONS.MEMBER_USERS);
      return users || [];
    } catch (error) {
      console.error('Get member users error:', error);
      return [];
    }
  }

  static async createMemberUser(memberId, username, password) {
    try {
      // Firebase Auth'da kullanıcı oluştur
      const email = username.includes('@') ? username : `${username}@ilsekreterlik.local`;
      await createUserWithEmailAndPassword(auth, email, password);

      // Firestore'a kaydet
      const docId = await FirebaseService.create(
        this.COLLECTIONS.MEMBER_USERS,
        null,
        {
          memberId,
          username,
          password: password, // Şifreleme FirebaseService içinde yapılacak
          userType: 'member',
          isActive: true
        }
      );

      return { success: true, id: docId, message: 'Kullanıcı oluşturuldu' };
    } catch (error) {
      console.error('Create member user error:', error);
      return { success: false, message: 'Kullanıcı oluşturulurken hata oluştu' };
    }
  }

  static async updateMemberUser(id, username, password) {
    try {
      const updateData = { username };
      if (password) {
        updateData.password = password;
      }

      await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, id, updateData);
      return { success: true, message: 'Kullanıcı güncellendi' };
    } catch (error) {
      console.error('Update member user error:', error);
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu' };
    }
  }

  static async toggleMemberUserStatus(id) {
    try {
      const user = await FirebaseService.getById(this.COLLECTIONS.MEMBER_USERS, id);
      await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, id, {
        isActive: !user.isActive
      });
      return { success: true, message: 'Kullanıcı durumu güncellendi' };
    } catch (error) {
      console.error('Toggle member user status error:', error);
      return { success: false, message: 'Kullanıcı durumu güncellenirken hata oluştu' };
    }
  }

  // Members API
  static async getMembers() {
    try {
      const members = await FirebaseService.getAll(this.COLLECTIONS.MEMBERS);
      return members || [];
    } catch (error) {
      console.error('Get members error:', error);
      return [];
    }
  }

  static async getMemberById(id) {
    try {
      const member = await FirebaseService.getById(this.COLLECTIONS.MEMBERS, id);
      return member;
    } catch (error) {
      console.error('Get member by id error:', error);
      return null;
    }
  }

  static async createMember(memberData) {
    try {
      const docId = await FirebaseService.create(
        this.COLLECTIONS.MEMBERS,
        null,
        memberData
      );
      return { success: true, id: docId, message: 'Üye oluşturuldu' };
    } catch (error) {
      console.error('Create member error:', error);
      return { success: false, message: 'Üye oluşturulurken hata oluştu' };
    }
  }

  static async updateMember(id, memberData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.MEMBERS, id, memberData);
      return { success: true, message: 'Üye güncellendi' };
    } catch (error) {
      console.error('Update member error:', error);
      return { success: false, message: 'Üye güncellenirken hata oluştu' };
    }
  }

  static async deleteMember(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.MEMBERS, id);
      return { success: true, message: 'Üye silindi' };
    } catch (error) {
      console.error('Delete member error:', error);
      return { success: false, message: 'Üye silinirken hata oluştu' };
    }
  }

  // Meetings API
  static async getMeetings() {
    try {
      const meetings = await FirebaseService.getAll(this.COLLECTIONS.MEETINGS);
      return meetings || [];
    } catch (error) {
      console.error('Get meetings error:', error);
      return [];
    }
  }

  static async createMeeting(meetingData) {
    try {
      const docId = await FirebaseService.create(
        this.COLLECTIONS.MEETINGS,
        null,
        meetingData
      );
      return { success: true, id: docId, message: 'Toplantı oluşturuldu' };
    } catch (error) {
      console.error('Create meeting error:', error);
      return { success: false, message: 'Toplantı oluşturulurken hata oluştu' };
    }
  }

  static async updateMeeting(id, meetingData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.MEETINGS, id, meetingData);
      return { success: true, message: 'Toplantı güncellendi' };
    } catch (error) {
      console.error('Update meeting error:', error);
      return { success: false, message: 'Toplantı güncellenirken hata oluştu' };
    }
  }

  // Events API
  static async getEvents() {
    try {
      const events = await FirebaseService.getAll(this.COLLECTIONS.EVENTS);
      return events || [];
    } catch (error) {
      console.error('Get events error:', error);
      return [];
    }
  }

  static async createEvent(eventData) {
    try {
      const docId = await FirebaseService.create(
        this.COLLECTIONS.EVENTS,
        null,
        eventData
      );
      return { success: true, id: docId, message: 'Etkinlik oluşturuldu' };
    } catch (error) {
      console.error('Create event error:', error);
      return { success: false, message: 'Etkinlik oluşturulurken hata oluştu' };
    }
  }

  static async updateEvent(id, eventData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.EVENTS, id, eventData);
      return { success: true, message: 'Etkinlik güncellendi' };
    } catch (error) {
      console.error('Update event error:', error);
      return { success: false, message: 'Etkinlik güncellenirken hata oluştu' };
    }
  }

  // Regions API
  static async getRegions() {
    try {
      const regions = await FirebaseService.getAll(this.COLLECTIONS.REGIONS);
      return regions || [];
    } catch (error) {
      console.error('Get regions error:', error);
      return [];
    }
  }

  // Positions API
  static async getPositions() {
    try {
      const positions = await FirebaseService.getAll(this.COLLECTIONS.POSITIONS);
      return positions || [];
    } catch (error) {
      console.error('Get positions error:', error);
      return [];
    }
  }

  static async getPermissionsForPosition(position) {
    try {
      const permissions = await FirebaseService.findByField(
        'position_permissions',
        'position',
        position
      );
      return permissions || [];
    } catch (error) {
      console.error('Get permissions for position error:', error);
      return [];
    }
  }

  // Member Registrations API
  static async getMemberRegistrations() {
    try {
      const registrations = await FirebaseService.getAll('member_registrations');
      return registrations || [];
    } catch (error) {
      console.error('Get member registrations error:', error);
      return [];
    }
  }
}

export default FirebaseApiService;

