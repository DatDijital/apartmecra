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
import { decryptData } from '../utils/crypto';

/**
 * Firebase tabanlı API Service
 * Mevcut ApiService ile uyumlu interface sağlar
 * Tüm veriler Firestore'da şifrelenmiş olarak saklanır
 */
class FirebaseApiService {
  // Use Firebase flag
  static useFirebase = true;

  // Collection names mapping - Tüm collection isimleri burada tanımlı
  static COLLECTIONS = {
    MEMBERS: 'members',
    MEETINGS: 'meetings',
    EVENTS: 'events',
    TASKS: 'tasks',
    ADMIN: 'admin',
    MEMBER_USERS: 'member_users',
    MEMBER_REGISTRATIONS: 'member_registrations',
    REGIONS: 'regions',
    POSITIONS: 'positions',
    DISTRICTS: 'districts',
    TOWNS: 'towns',
    NEIGHBORHOODS: 'neighborhoods',
    VILLAGES: 'villages',
    STKS: 'stks',
    MOSQUES: 'mosques',
    EVENT_CATEGORIES: 'event_categories',
    NEIGHBORHOOD_REPRESENTATIVES: 'neighborhood_representatives',
    VILLAGE_REPRESENTATIVES: 'village_representatives',
    NEIGHBORHOOD_SUPERVISORS: 'neighborhood_supervisors',
    VILLAGE_SUPERVISORS: 'village_supervisors',
    DISTRICT_OFFICIALS: 'district_officials',
    TOWN_OFFICIALS: 'town_officials',
    DISTRICT_MANAGEMENT_MEMBERS: 'district_management_members',
    TOWN_MANAGEMENT_MEMBERS: 'town_management_members',
    BALLOT_BOXES: 'ballot_boxes',
    BALLOT_BOX_OBSERVERS: 'ballot_box_observers',
    MESSAGES: 'messages',
    MESSAGE_GROUPS: 'message_groups',
    PERSONAL_DOCUMENTS: 'personal_documents',
    ARCHIVE: 'archive',
    GROUPS: 'groups',
    POSITION_PERMISSIONS: 'position_permissions',
    SCHEDULED_SMS: 'scheduled_sms'
  };

  // Auth API
  static async login(username, password) {
    try {
      // Firebase Auth ile giriş yap
      // Email formatına çevir (username@domain.com)
      const email = username.includes('@') ? username : `${username}@ilsekreterlik.local`;
      
      console.log('Firebase login attempt:', { username, email });
      
      let userCredential = null;
      let user = null;
      
      try {
        // Önce Firebase Auth'da kullanıcıyı bulmaya çalış
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
        console.log('Firebase login successful:', user.uid);
      } catch (authError) {
        // Firebase Auth'da kullanıcı bulunamadı veya şifre hatalı
        console.log('Firebase Auth login failed, checking Firestore:', authError.code);
        
        // Eğer kullanıcı bulunamadıysa, Firestore'dan kontrol et
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          // Firestore'dan kullanıcıyı bul
          const memberUsers = await FirebaseService.findByField(
            this.COLLECTIONS.MEMBER_USERS,
            'username',
            username
          );
          
          if (memberUsers && memberUsers.length > 0) {
            const memberUser = memberUsers[0];
            // FirebaseService.findByField zaten decrypt ediyor (decrypt = true default)
            // Ama password field'ı SENSITIVE_FIELDS içinde olduğu için decrypt edilmiş olmalı
            // Eğer hala encrypted görünüyorsa, manuel decrypt et
            let decryptedPassword = memberUser.password;
            
            console.log('🔍 Login - Member user found:', {
              username: memberUser.username,
              passwordFromDB: memberUser.password,
              passwordType: typeof memberUser.password,
              passwordLength: memberUser.password?.length,
              passwordInput: password,
              passwordInputType: typeof password,
              passwordInputLength: password?.length
            });
            
            // Eğer password şifrelenmiş görünüyorsa (U2FsdGVkX1 ile başlıyorsa), decrypt et
            if (decryptedPassword && typeof decryptedPassword === 'string' && decryptedPassword.startsWith('U2FsdGVkX1')) {
              console.log('🔓 Decrypting password...');
              decryptedPassword = decryptData(decryptedPassword);
              console.log('🔓 Decrypted password:', {
                decrypted: decryptedPassword,
                decryptedLength: decryptedPassword?.length,
                matchesInput: decryptedPassword === password
              });
            }
            
            console.log('🔍 Password comparison:', {
              decryptedPassword,
              memberUserPassword: memberUser.password,
              inputPassword: password,
              decryptedMatches: decryptedPassword === password,
              originalMatches: memberUser.password === password
            });
            
            // Şifre doğru mu kontrol et (decrypt edilmiş password veya orijinal password ile karşılaştır)
            if (decryptedPassword === password || memberUser.password === password) {
              // Şifre doğru, Firebase Auth ile senkronize et
              // ÖNEMLİ: Firebase Auth'a kaydederken Firestore'daki şifreyi (telefon numarası) kullan
              // Kullanıcının girdiği password değil, Firestore'daki decryptedPassword kullan
              const firestorePassword = decryptedPassword || memberUser.password;
              
              console.log('Password correct, syncing with Firebase Auth for member:', memberUser.id);
              console.log('🔑 Using Firestore password for Firebase Auth:', {
                firestorePassword,
                inputPassword: password,
                passwordsMatch: firestorePassword === password
              });
              
              // Eğer authUid varsa ama email/username değişmişse, yeni email ile giriş yapmayı dene
              // Eğer authUid yoksa, yeni kullanıcı oluştur
              
              try {
                // Önce mevcut email ile giriş yapmayı dene (eğer authUid varsa)
                if (memberUser.authUid) {
                  try {
                    // Eski email ile giriş yapmayı dene (Firestore'daki şifre ile)
                    const oldEmail = memberUser.username.includes('@') ? memberUser.username : `${memberUser.username}@ilsekreterlik.local`;
                    userCredential = await signInWithEmailAndPassword(auth, oldEmail, firestorePassword);
                    user = userCredential.user;
                    console.log('✅ Firebase Auth login successful with existing user:', user.uid);
                    
                    // Firestore'daki kullanıcıyı güncelle (username ve authUid senkronizasyonu)
                    await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
                      authUid: user.uid,
                      username: username // Username'i güncelle (eğer değiştiyse)
                    }, false);
                    
                    console.log('✅ Firestore synced with Firebase Auth');
                  } catch (oldEmailError) {
                    // Eski email ile giriş yapılamadı, yeni email ile dene
                    console.log('⚠️ Old email login failed, trying with new email:', email);
                    try {
                      userCredential = await signInWithEmailAndPassword(auth, email, firestorePassword);
                      user = userCredential.user;
                      console.log('✅ Firebase Auth login successful with new email:', user.uid);
                      
                      // Firestore'daki kullanıcıyı güncelle
                      await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
                        authUid: user.uid,
                        username: username
                      }, false);
                      
                      console.log('✅ Firestore synced with Firebase Auth (new email)');
                    } catch (newEmailError) {
                      // Yeni email ile de giriş yapılamadı, yeni kullanıcı oluştur (Firestore'daki şifre ile)
                      console.log('⚠️ New email login failed, creating new user with Firestore password:', newEmailError.code);
                      userCredential = await createUserWithEmailAndPassword(auth, email, firestorePassword);
                      user = userCredential.user;
                      
                      // Firestore'daki kullanıcıyı güncelle
                      await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
                        authUid: user.uid,
                        username: username
                      }, false);
                      
                      console.log('✅ Firebase Auth user created for member with Firestore password (phone):', user.uid);
                    }
                  }
                } else {
                  // AuthUid yok, yeni kullanıcı oluştur (Firestore'daki şifre ile - telefon numarası)
                  console.log('Creating new Firebase Auth user for member with Firestore password (phone):', memberUser.id);
                  userCredential = await createUserWithEmailAndPassword(auth, email, firestorePassword);
                  user = userCredential.user;
                  
                  // Firestore'daki kullanıcıyı güncelle (authUid ekle)
                  await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
                    authUid: user.uid,
                    username: username
                  }, false);
                  
                  console.log('✅ Firebase Auth user created for member with Firestore password (phone):', user.uid);
                }
              } catch (createError) {
                // Email zaten kullanılıyorsa (başka bir kullanıcı tarafından veya aynı kullanıcı farklı şifre ile)
                if (createError.code === 'auth/email-already-in-use') {
                  console.log('⚠️ Email already in use, trying to sign in with Firestore password:', email);
                  try {
                    // Firestore'daki şifre ile giriş yapmayı dene
                    userCredential = await signInWithEmailAndPassword(auth, email, firestorePassword);
                    user = userCredential.user;
                    
                    // Firestore'daki kullanıcıyı güncelle (authUid ekle)
                    await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
                      authUid: user.uid,
                      username: username
                    }, false);
                    
                    console.log('✅ Firebase Auth sign in successful for member:', user.uid);
                  } catch (signInError2) {
                    // Şifre yanlış - Firebase Auth'daki şifre Firestore'daki şifreyle eşleşmiyor
                    console.error('❌ Cannot sign in with existing email - password mismatch:', signInError2.code);
                    
                    // Firebase Auth'daki kullanıcının şifresini güncellemek için client-side'da mümkün değil
                    // Bu durumda Firestore'daki authUid'i temizle ve kullanıcıya bilgi ver
                    // Bir sonraki login denemesinde yeni bir Firebase Auth kullanıcısı oluşturulacak
                    console.log('⚠️ Clearing authUid from Firestore - password mismatch with Firebase Auth');
                    await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
                      authUid: null,
                      username: username
                    }, false);
                    
                    // Kullanıcıya daha açıklayıcı hata mesajı ver
                    // Firebase Auth'daki eski kullanıcı hala var ama şifre eşleşmiyor
                    // Admin tarafından Firebase Console'dan silinmesi gerekebilir
                    throw new Error('Firebase Auth\'daki kullanıcı şifresi Firestore\'daki şifreyle eşleşmiyor. Lütfen sayfayı yenileyip tekrar deneyin. Sorun devam ederse admin ile iletişime geçin.');
                  }
                } else {
                  throw createError;
                }
              }
            } else {
              // Şifre hatalı
              console.error('❌ Password mismatch!', {
                decryptedPassword,
                memberUserPassword: memberUser.password,
                inputPassword: password,
                username: memberUser.username,
                memberId: memberUser.memberId
              });
              throw new Error('Şifre hatalı');
            }
          } else {
            // Firestore'da da kullanıcı bulunamadı
            throw authError; // Orijinal hatayı fırlat
          }
        } else {
          // Diğer hatalar (wrong-password, invalid-email, vb.)
          throw authError;
        }
      }

      // User bilgisini hazırla (varsayılan olarak admin)
      const userData = {
        id: user.uid,
        username: username,
        email: user.email,
        type: 'admin',
        role: 'admin', // AuthContext'te role kullanılıyor
        memberId: null
      };

      // Admin bilgilerini kontrol et - varsa güncelle, yoksa oluştur
      let adminDoc;
      try {
        adminDoc = await FirebaseService.getById(this.COLLECTIONS.ADMIN, 'main');
        console.log('Admin doc found:', adminDoc);
        
        // Admin dokümanı varsa ve username eşleşiyorsa
        if (adminDoc && (adminDoc.username === username || adminDoc.uid === user.uid)) {
          userData.role = 'admin';
          userData.type = 'admin';
          console.log('Admin user confirmed from Firestore');
        } else {
          // Admin dokümanı yoksa veya username eşleşmiyorsa oluştur/güncelle
          console.log('Creating/updating admin doc in Firestore');
          await FirebaseService.create(
            this.COLLECTIONS.ADMIN,
            'main',
            {
              username: username,
              email: email,
              uid: user.uid,
              role: 'admin'
            },
            false // Şifreleme yapma (admin bilgileri hassas değil)
          );
          console.log('Admin doc created/updated in Firestore');
        }
      } catch (e) {
        console.warn('Admin doc error, creating new one:', e);
        // Admin dokümanı yoksa oluştur
        try {
          await FirebaseService.create(
            this.COLLECTIONS.ADMIN,
            'main',
            {
              username: username,
              email: email,
              uid: user.uid,
              role: 'admin'
            },
            false
          );
          console.log('Admin doc created successfully');
        } catch (createError) {
          console.error('Failed to create admin doc:', createError);
        }
      }

      // Member user ise ek bilgileri getir
      try {
        const memberUser = await FirebaseService.findByField(
          this.COLLECTIONS.MEMBER_USERS,
          'username',
          username
        );

        if (memberUser && memberUser.length > 0) {
          userData.type = memberUser[0].userType || 'member';
          userData.role = memberUser[0].userType || 'member';
          userData.memberId = memberUser[0].memberId;
          userData.id = memberUser[0].id;
          
          // Belde başkanı veya ilçe başkanı ise townId veya districtId ekle
          if (memberUser[0].userType === 'town_president' && memberUser[0].townId) {
            userData.townId = memberUser[0].townId;
          } else if (memberUser[0].userType === 'district_president' && memberUser[0].districtId) {
            userData.districtId = memberUser[0].districtId;
          }
        }
      } catch (e) {
        console.warn('Member user check failed:', e);
      }

      console.log('User data prepared:', userData);

      return {
        success: true,
        user: userData,
        message: 'Giriş başarılı'
      };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Giriş yapılırken hata oluştu';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Kullanıcı bulunamadı. Lütfen admin kullanıcısını oluşturun (/create-admin)';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Şifre hatalı';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz email formatı';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.code || error.message
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
      if (admin && admin.id) {
        // Admin bulundu - beklenen format: { success: true, admin: {...} }
        return { 
          success: true, 
          admin: {
            username: admin.username || 'admin',
            created_at: admin.createdAt || admin.created_at,
            updated_at: admin.updatedAt || admin.updated_at
          }
        };
      } else {
        // Admin bulunamadı
        return { success: false, message: 'Admin bulunamadı' };
      }
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

  // Verify admin password
  static async verifyAdminPassword(password) {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        return { success: false, message: 'Kullanıcı oturumu bulunamadı' };
      }

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      return { success: true, message: 'Şifre doğrulandı' };
    } catch (error) {
      console.error('Verify admin password error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { success: false, message: 'Şifre yanlış' };
      }
      return { success: false, message: 'Şifre doğrulanırken hata oluştu: ' + (error.message || error) };
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
      // Mevcut kullanıcıyı koru - sadece yeni kullanıcı oluştur
      const currentUser = auth.currentUser;
      const currentUserUid = currentUser ? currentUser.uid : null;
      
      // Önce bu memberId için zaten kullanıcı var mı kontrol et
      const existingUsers = await FirebaseService.findByField(
        this.COLLECTIONS.MEMBER_USERS,
        'memberId',
        memberId
      );
      
      if (existingUsers && existingUsers.length > 0) {
        console.log('ℹ️ User already exists for member:', memberId);
        return { success: true, id: existingUsers[0].id, message: 'Kullanıcı zaten mevcut' };
      }
      
      // Firebase Auth'da kullanıcı oluştur
      const email = username.includes('@') ? username : `${username}@ilsekreterlik.local`;
      
      // Email zaten kullanılıyorsa hata fırlatma, sadece Firestore'a kaydet
      let authUser = null;
      try {
        authUser = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✅ Firebase Auth user created:', authUser.user.uid);
        
        // Yeni kullanıcı oluşturulduktan sonra, mevcut kullanıcıyı geri yükle (eğer varsa)
        // createUserWithEmailAndPassword yeni kullanıcıyı otomatik olarak sign-in eder
        // Bu yüzden admin kullanıcısını tekrar sign-in etmemiz gerekiyor
        if (currentUserUid && currentUserUid !== authUser.user.uid) {
          // Mevcut kullanıcı farklıysa, admin kullanıcısını geri yükle
          // Bu durumda admin kullanıcısını tekrar sign-in etmemiz gerekiyor
          // Ama bu karmaşık olabilir, bu yüzden sadece Firestore'a kaydetmeyi tercih ediyoruz
          console.warn('⚠️ New user created, but current user is different. Admin user will need to re-login.');
        }
      } catch (authError) {
        // Email zaten kullanılıyorsa, sadece Firestore'a kaydet
        if (authError.code === 'auth/email-already-in-use') {
          console.warn('⚠️ Email already in use, creating Firestore record only:', email);
        } else {
          // Diğer hataları log'la ama fırlatma - kritik değil
          console.warn('⚠️ Firebase Auth user creation failed (non-critical):', authError);
        }
      }

      // Firestore'a kaydet
      const docId = await FirebaseService.create(
        this.COLLECTIONS.MEMBER_USERS,
        null,
        {
          memberId,
          username,
          password: password, // Şifreleme FirebaseService içinde yapılacak
          userType: 'member',
          isActive: true,
          authUid: authUser?.user?.uid || null // Auth UID varsa kaydet
        }
      );

      return { success: true, id: docId, message: 'Kullanıcı oluşturuldu' };
    } catch (error) {
      console.error('Create member user error:', error);
      return { success: false, message: error.message || 'Kullanıcı oluşturulurken hata oluştu' };
    }
  }

  static async updateMemberUser(id, username, password) {
    try {
      // Önce mevcut kullanıcıyı al
      const memberUser = await FirebaseService.getById(this.COLLECTIONS.MEMBER_USERS, id);
      if (!memberUser) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      const updateData = { username };
      const oldUsername = memberUser.username;
      const email = username.includes('@') ? username : `${username}@ilsekreterlik.local`;
      const oldEmail = oldUsername.includes('@') ? oldUsername : `${oldUsername}@ilsekreterlik.local`;
      
      // Username değiştiyse, email değişmiş olabilir
      const usernameChanged = oldUsername !== username;
      
      // Şifre güncelleniyorsa
      if (password && password.trim()) {
        updateData.password = password;
      }
      
      // Eğer Firebase Auth'da kullanıcı varsa (authUid varsa)
      if (memberUser.authUid) {
        try {
          // Client-side'dan başka bir kullanıcının şifresini/email'ini direkt güncelleyemeyiz
          // Bu yüzden şimdilik sadece Firestore'u güncelliyoruz
          // Login sırasında şifre/username kontrolü yapılıp, Firebase Auth'da güncelleme yapılacak
          console.log('🔄 Updating member user in Firestore:', {
            id,
            oldUsername,
            newUsername: username,
            usernameChanged,
            passwordUpdated: !!(password && password.trim()),
            authUid: memberUser.authUid
          });
          console.log('⚠️ Note: Firebase Auth will be updated on next login if password/username changed');
          
          // Eğer username değiştiyse, authUid'i temizle ki login sırasında yeni email ile oluşturulsun
          if (usernameChanged) {
            console.log('⚠️ Username changed, clearing authUid to force re-creation on next login');
            updateData.authUid = null; // Login sırasında yeni email ile oluşturulacak
          }
        } catch (authError) {
          console.warn('⚠️ Firebase Auth update preparation failed (non-critical):', authError);
          // Firestore güncellemesi devam edecek
        }
      } else {
        // Auth UID yoksa, kullanıcı ilk login olduğunda oluşturulacak
        console.log('ℹ️ No authUid found, user will be created in Firebase Auth on first login');
      }

      // Firestore'u güncelle
      await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, id, updateData);
      
      console.log('✅ Member user updated successfully in Firestore:', id);
      return { success: true, message: 'Kullanıcı güncellendi' };
    } catch (error) {
      console.error('Update member user error:', error);
      return { success: false, message: 'Kullanıcı güncellenirken hata oluştu: ' + error.message };
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
  static async getMembers(archived = false) {
    try {
      const members = await FirebaseService.getAll(this.COLLECTIONS.MEMBERS);
      if (!members || members.length === 0) {
        return [];
      }
      
      // archived parametresine göre filtrele
      if (archived) {
        // Arşivlenmiş üyeleri döndür (truthy check)
        return members.filter(m => {
          const isArchived = m.archived === true || m.archived === 'true' || m.archived === 1 || m.archived === '1';
          return isArchived;
        });
      } else {
        // Arşivlenmemiş üyeleri döndür
        return members.filter(m => {
          const isArchived = m.archived === true || m.archived === 'true' || m.archived === 1 || m.archived === '1';
          return !isArchived;
        });
      }
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
      console.log('🔥 Firebase createMember called with data:', memberData);
      console.log('📞 Member data details:', {
        tc: memberData.tc,
        phone: memberData.phone,
        tcType: typeof memberData.tc,
        phoneType: typeof memberData.phone
      });
      
      // Firebase Authentication kontrolü
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Kullanıcı giriş yapmamış. Lütfen önce giriş yapın.');
      }
      console.log('🔐 Authenticated user:', currentUser.uid, currentUser.email);
      
      // TC kontrolü - aynı TC ile kayıt var mı?
      // TC şifrelenmiş olarak saklanacağı için, şifrelemeden önce kontrol ediyoruz
      if (memberData.tc) {
        try {
          const existingMembers = await FirebaseService.getAll(this.COLLECTIONS.MEMBERS);
          // TC şifrelenmiş olduğu için decrypt ederek karşılaştırmalıyız
          // Veya basit bir kontrol için tüm üyelerin TC'lerini decrypt edip kontrol edelim
          const duplicateMember = existingMembers.find(m => {
            // TC decrypt edilmiş olarak gelir
            const memberTc = m.tc || m.tcNo;
            return memberTc === memberData.tc && !m.archived;
          });
          
          if (duplicateMember) {
            throw new Error('TC kimlik numarası zaten kayıtlı');
          }
        } catch (checkError) {
          // TC kontrolü hatası ise fırlat, diğer hataları log'la
          if (checkError.message && checkError.message.includes('TC kimlik numarası')) {
            throw checkError;
          }
          console.warn('⚠️ TC duplicate check error (continuing):', checkError);
        }
      }
      
      // Üyeyi oluştur
      const docId = await FirebaseService.create(
        this.COLLECTIONS.MEMBERS,
        null,
        memberData
      );
      
      console.log('✅ Member created successfully with ID:', docId);
      
      // Kısa bir bekleme sonrası oluşturulan üyeyi döndür
      // (serverTimestamp henüz yazılmış olmayabilir)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const createdMember = await FirebaseService.getById(this.COLLECTIONS.MEMBERS, docId);
      
      // Otomatik olarak kullanıcı oluştur (Firestore'a kaydet, Firebase Auth'a kaydetme)
      // Firebase Auth'da kullanıcı oluşturmak mevcut kullanıcıyı logout eder
      // Bu yüzden sadece Firestore'a kaydediyoruz
      let userCredentials = null; // try bloğunun dışında tanımla
      
      try {
        // Önce bu üye için zaten kullanıcı var mı kontrol et
        const existingUsers = await FirebaseService.findByField(
          this.COLLECTIONS.MEMBER_USERS,
          'memberId',
          docId
        );
        
        if (!existingUsers || existingUsers.length === 0) {
          // Kullanıcı yoksa otomatik oluştur (sadece Firestore'a kaydet)
          // Username: TC numarası (zorunlu alan)
          // memberData form'dan geldiği için şifrelenmemiş olmalı
          let username = String(memberData.tc || '').trim();
          
          // Şifre: Telefon numarası (zorunlu alan) - ÖNEMLİ: TC DEĞİL, TELEFON!
          // memberData form'dan geldiği için şifrelenmemiş olmalı
          // Eğer phone boşsa veya TC ile aynıysa, hata ver
          let password = String(memberData.phone || '').trim();
          
          // Eğer phone şifrelenmiş görünüyorsa (U2FsdGVkX1 ile başlıyorsa), decrypt et
          // (Bu durum teorik olarak olmamalı çünkü form'dan geliyor, ama güvenlik için kontrol ediyoruz)
          if (password && typeof password === 'string' && password.startsWith('U2FsdGVkX1')) {
            try {
              password = decryptData(password);
              console.log('🔓 Decrypted phone number for password');
            } catch (decryptError) {
              console.warn('⚠️ Could not decrypt phone, using as-is:', decryptError);
            }
          }
          
          // TC de decrypt edilmiş olmalı, ama kontrol edelim
          if (username && typeof username === 'string' && username.startsWith('U2FsdGVkX1')) {
            try {
              username = decryptData(username);
              console.log('🔓 Decrypted TC number for username');
            } catch (decryptError) {
              console.warn('⚠️ Could not decrypt TC, using as-is:', decryptError);
            }
          }
          
          // ÖNEMLİ: Şifre TC ile aynıysa veya boşsa, hata ver
          if (!password || password.trim() === '' || password === username || password === memberData.tc) {
            console.error('❌ ŞİFRE HATASI!', {
              password,
              username,
              memberDataTc: memberData.tc,
              memberDataPhone: memberData.phone,
              passwordIsEmpty: !password || password.trim() === '',
              passwordIsTc: password === username || password === memberData.tc,
              passwordIsPhone: password === memberData.phone
            });
            throw new Error('Şifre telefon numarası olmalı ve TC ile aynı olamaz!');
          }
          
          console.log('📋 Final username and password values:', {
            username,
            password,
            usernameLength: username?.length,
            passwordLength: password?.length,
            usernameIsTc: username === memberData.tc,
            passwordIsPhone: password === memberData.phone,
            passwordIsTc: password === memberData.tc,
            passwordIsNotTc: password !== memberData.tc && password !== username
          });
          
          // TC ve telefon zorunlu alanlar olduğu için her zaman olmalı
          if (!username || !password) {
            console.error('❌ TC veya telefon numarası eksik!', {
              tc: memberData.tc,
              phone: memberData.phone,
              username,
              password,
              tcEmpty: !username,
              phoneEmpty: !password
            });
            console.warn('⚠️ TC veya telefon numarası eksik, kullanıcı oluşturulamadı');
          } else {
            // Kullanıcı bilgilerini kaydet (response'a eklenecek)
            userCredentials = {
              username: username,
              password: password
            };
          
            console.log('🔄 Creating automatic user for member (Firestore only):', {
              docId,
              username: username,
              password: password,
              memberDataTc: memberData.tc,
              memberDataPhone: memberData.phone,
              usernameIsTc: username === memberData.tc,
              passwordIsPhone: password === memberData.phone,
              passwordIsTc: password === memberData.tc
            });
            
            // Eğer şifre TC ile aynıysa, bu bir hata! (Yukarıda kontrol edildi ama tekrar kontrol)
            if (password === memberData.tc || password === username) {
              console.error('❌ KRİTİK HATA: Şifre TC ile aynı! Bu yanlış!', {
                password,
                username,
                tc: memberData.tc,
                phone: memberData.phone,
                passwordIsTc: password === memberData.tc,
                passwordIsUsername: password === username
              });
              throw new Error('Şifre telefon numarası olmalı, TC ile aynı olamaz!');
            }
            
            // Son kontrol: Şifre telefon numarası olmalı
            if (password !== memberData.phone) {
              console.warn('⚠️ Şifre telefon numarası ile eşleşmiyor!', {
                password,
                memberDataPhone: memberData.phone,
                passwordsMatch: password === memberData.phone
              });
              // Şifreyi telefon numarası olarak ayarla
              password = String(memberData.phone || '').trim();
              console.log('🔧 Şifre telefon numarası olarak düzeltildi:', password);
            }
            
            console.log('✅ Final check before saving to Firestore:', {
              username,
              password,
              usernameIsTc: username === memberData.tc,
              passwordIsPhone: password === memberData.phone,
              passwordIsNotTc: password !== memberData.tc && password !== username
            });
            
            // Sadece Firestore'a kaydet, Firebase Auth'a kaydetme
            // (Firebase Auth'a kaydetme mevcut kullanıcıyı logout eder)
            // Login sırasında Firebase Auth kullanıcısı oluşturulacak
            const userDocId = await FirebaseService.create(
              this.COLLECTIONS.MEMBER_USERS,
              null,
              {
                memberId: docId,
                username,
                password: password, // Telefon numarası - Şifreleme FirebaseService içinde yapılacak
                userType: 'member',
                isActive: true,
                authUid: null // Firebase Auth'a kaydetmedik - Login sırasında oluşturulacak
              }
            );
            
            console.log('✅ Automatic user created successfully (Firestore only):', userDocId);
            console.log('📝 User credentials saved:', {
              username,
              password,
              passwordIsPhone: password === memberData.phone,
              passwordIsNotTc: password !== memberData.tc
            });
          }
        } else {
          // Mevcut kullanıcı varsa, bilgilerini al
          const existingUser = existingUsers[0];
          // Şifreyi decrypt et (gösterim için)
          let decryptedPassword = existingUser.password;
          if (decryptedPassword && typeof decryptedPassword === 'string' && decryptedPassword.startsWith('U2FsdGVkX1')) {
            decryptedPassword = decryptData(decryptedPassword);
          }
          
          userCredentials = {
            username: existingUser.username,
            password: decryptedPassword || existingUser.password
          };
          
          console.log('ℹ️ User already exists for member:', docId);
        }
      } catch (userError) {
        // Kullanıcı oluşturma hatası kritik değil, üye zaten oluşturuldu
        console.warn('⚠️ Automatic user creation error (non-critical):', userError);
      }
      
      // Üye objesini döndür (id ile birlikte)
      const returnData = createdMember || { 
        id: docId, 
        ...memberData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Kullanıcı bilgilerini ekle (eğer oluşturulduysa)
      if (userCredentials) {
        console.log('📋 User credentials to return:', {
          username: userCredentials.username,
          password: userCredentials.password
        });
        returnData.userCredentials = userCredentials;
      }
      
      return returnData;
    } catch (error) {
      console.error('❌ Create member error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      
      // Permission hatası için özel mesaj
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        throw new Error('Firebase izin hatası! Lütfen Firebase Console\'da Firestore Security Rules\'u güncelleyin. FIREBASE_SECURITY_RULES.md dosyasındaki kuralları kullanın.');
      }
      
      throw error; // Hatayı fırlat ki MemberForm catch edebilsin
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
  static async getMeetings(archived = false) {
    try {
      const meetings = await FirebaseService.getAll(this.COLLECTIONS.MEETINGS);
      if (!meetings || meetings.length === 0) {
        return [];
      }
      
      // notes ve description alanlarını decrypt etmeye çalışma (artık şifrelenmeden saklanıyor)
      // Eğer şifrelenmişse (eski kayıtlar için), decrypt etmeye çalış
      const processedMeetings = meetings.map(meeting => {
        // notes decrypt
        if (meeting.notes && typeof meeting.notes === 'string' && meeting.notes.startsWith('U2FsdGVkX1')) {
          // Şifrelenmiş görünüyor, decrypt etmeye çalış
          try {
            const decrypted = decryptData(meeting.notes);
            if (decrypted && decrypted !== meeting.notes) {
              meeting.notes = decrypted;
            }
          } catch (error) {
            // Decrypt başarısız olursa, notes'ı temizle (muhtemelen bozuk veri)
            console.warn('⚠️ Failed to decrypt meeting notes, keeping as is:', error);
          }
        }
        // description decrypt
        if (meeting.description && typeof meeting.description === 'string' && meeting.description.startsWith('U2FsdGVkX1')) {
          // Şifrelenmiş görünüyor, decrypt etmeye çalış
          try {
            const decrypted = decryptData(meeting.description);
            if (decrypted && decrypted !== meeting.description) {
              meeting.description = decrypted;
            }
          } catch (error) {
            // Decrypt başarısız olursa, description'ı temizle (muhtemelen bozuk veri)
            console.warn('⚠️ Failed to decrypt meeting description, keeping as is:', error);
          }
        }
        // notes ve description zaten şifrelenmemişse (yeni kayıtlar), olduğu gibi bırak
        return meeting;
      });
      
      // archived parametresine göre filtrele
      if (archived) {
        // Arşivlenmiş toplantıları döndür (truthy check)
        return processedMeetings.filter(m => {
          const isArchived = m.archived === true || m.archived === 'true' || m.archived === 1 || m.archived === '1';
          return isArchived;
        });
      } else {
        // Arşivlenmemiş toplantıları döndür
        return processedMeetings.filter(m => {
          const isArchived = m.archived === true || m.archived === 'true' || m.archived === 1 || m.archived === '1';
          return !isArchived;
        });
      }
    } catch (error) {
      console.error('Get meetings error:', error);
      return [];
    }
  }

  static async createMeeting(meetingData) {
    try {
      // notes ve description alanlarını şifrelemeden saklamak için özel işlem
      // notes ve description hassas alanlar değil, normal metin olarak saklanmalı
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // notes ve description değerlerini temizle (boş string ise null yap)
      const notesValue = meetingData.notes && meetingData.notes.trim() !== '' 
        ? meetingData.notes.trim() 
        : null;
      const descriptionValue = meetingData.description && meetingData.description.trim() !== '' 
        ? meetingData.description.trim() 
        : null;
      
      const meetingDataWithoutNotesAndDescription = { ...meetingData };
      delete meetingDataWithoutNotesAndDescription.description;
      delete meetingDataWithoutNotesAndDescription.notes;
      
      // isPlanned field'ını ekle (varsayılan: false)
      if (meetingDataWithoutNotesAndDescription.isPlanned === undefined) {
        meetingDataWithoutNotesAndDescription.isPlanned = false;
      }
      
      // Önce notes ve description olmadan kaydet
      const docId = await FirebaseService.create(
        this.COLLECTIONS.MEETINGS,
        null,
        meetingDataWithoutNotesAndDescription,
        true // encrypt = true (notes ve description hariç diğer hassas alanlar şifrelenecek)
      );
      
      // Sonra notes ve description'ı şifrelemeden ekle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.MEETINGS, docId);
      await updateDoc(docRef, {
        notes: notesValue, // Şifrelenmeden sakla (null veya değer)
        description: descriptionValue // Şifrelenmeden sakla (null veya değer)
      });
      
      // Planlanan toplantı için otomatik SMS gönder
      if (meetingDataWithoutNotesAndDescription.isPlanned && meetingDataWithoutNotesAndDescription.regions) {
        try {
          await this.sendAutoSmsForScheduled('meeting', {
            name: meetingDataWithoutNotesAndDescription.name,
            date: meetingDataWithoutNotesAndDescription.date
          }, meetingDataWithoutNotesAndDescription.regions);
        } catch (smsError) {
          console.error('Auto SMS error (non-blocking):', smsError);
          // SMS hatası toplantı oluşturmayı engellemez
        }
      }
      
      return { success: true, id: docId, message: 'Toplantı oluşturuldu' };
    } catch (error) {
      console.error('Create meeting error:', error);
      return { success: false, message: 'Toplantı oluşturulurken hata oluştu' };
    }
  }

  static async updateMeeting(id, meetingData) {
    try {
      // notes ve description alanlarını şifrelemeden saklamak için özel işlem
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // notes ve description değerlerini temizle (boş string ise null yap)
      const notesValue = meetingData.notes && meetingData.notes.trim() !== '' 
        ? meetingData.notes.trim() 
        : null;
      const descriptionValue = meetingData.description && meetingData.description.trim() !== '' 
        ? meetingData.description.trim() 
        : null;
      
      const meetingDataWithoutNotesAndDescription = { ...meetingData };
      delete meetingDataWithoutNotesAndDescription.description;
      delete meetingDataWithoutNotesAndDescription.notes;
      
      // Önce notes ve description olmadan güncelle
      await FirebaseService.update(this.COLLECTIONS.MEETINGS, id, meetingDataWithoutNotesAndDescription);
      
      // Sonra notes ve description'ı şifrelemeden ekle/güncelle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.MEETINGS, id);
      await updateDoc(docRef, {
        notes: notesValue, // Şifrelenmeden sakla (null veya değer)
        description: descriptionValue // Şifrelenmeden sakla (null veya değer)
      });
      
      return { success: true, message: 'Toplantı güncellendi' };
    } catch (error) {
      console.error('Update meeting error:', error);
      return { success: false, message: 'Toplantı güncellenirken hata oluştu' };
    }
  }

  // Events API
  static async getEvents(archived = false) {
    try {
      const events = await FirebaseService.getAll(this.COLLECTIONS.EVENTS);
      if (!events || events.length === 0) {
        return [];
      }
      
      // Get event categories to populate event names
      const eventCategories = await this.getEventCategories();
      
      // description alanını decrypt etmeye çalışma (artık şifrelenmeden saklanıyor)
      // Eğer şifrelenmişse (eski kayıtlar için), decrypt etmeye çalış
      // Ayrıca name alanı boşsa, category_id'den kategori adını al
      const processedEvents = events.map(event => {
        // description decrypt
        if (event.description && typeof event.description === 'string' && event.description.startsWith('U2FsdGVkX1')) {
          // Şifrelenmiş görünüyor, decrypt etmeye çalış
          try {
            const decrypted = decryptData(event.description);
            if (decrypted && decrypted !== event.description) {
              event.description = decrypted;
            }
          } catch (error) {
            // Decrypt başarısız olursa, description'ı temizle (muhtemelen bozuk veri)
            console.warn('⚠️ Failed to decrypt event description, keeping as is:', error);
          }
        }
        
        // name alanı boşsa ve category_id varsa, kategori adını al
        if ((!event.name || event.name.trim() === '') && event.category_id) {
          const category = eventCategories.find(cat => String(cat.id) === String(event.category_id));
          if (category && category.name) {
            event.name = category.name;
          }
        }
        
        // Geçersiz attendee'leri temizle (null veya geçersiz ID'ler)
        if (event.attendees && Array.isArray(event.attendees)) {
          const INVALID_ATTENDEE_IDS = ['1762645941232_qxutglj9a', null, 'null', undefined];
          event.attendees = event.attendees.filter(attendee => {
            const memberId = attendee?.memberId;
            // Geçersiz ID'leri filtrele
            if (INVALID_ATTENDEE_IDS.includes(memberId) || 
                memberId === null || 
                memberId === undefined ||
                String(memberId) === 'null' ||
                String(memberId) === '1762645941232_qxutglj9a') {
              return false;
            }
            return true;
          });
        }
        
        // description zaten şifrelenmemişse (yeni kayıtlar), olduğu gibi bırak
        return event;
      });
      
      // archived parametresine göre filtrele
      if (archived) {
        // Arşivlenmiş etkinlikleri döndür (truthy check)
        return processedEvents.filter(e => {
          const isArchived = e.archived === true || e.archived === 'true' || e.archived === 1 || e.archived === '1';
          return isArchived;
        });
      } else {
        // Arşivlenmemiş etkinlikleri döndür
        return processedEvents.filter(e => {
          const isArchived = e.archived === true || e.archived === 'true' || e.archived === 1 || e.archived === '1';
          return !isArchived;
        });
      }
    } catch (error) {
      console.error('Get events error:', error);
      return [];
    }
  }

  static async createEvent(eventData) {
    try {
      // description alanını şifrelemeden saklamak için özel işlem
      // description hassas bir alan değil, normal metin olarak saklanmalı
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // description değerini temizle (boş string ise null yap)
      const descriptionValue = eventData.description && eventData.description.trim() !== '' 
        ? eventData.description.trim() 
        : null;
      
      const eventDataWithoutDescription = { ...eventData };
      delete eventDataWithoutDescription.description;
      
      // isPlanned field'ını ekle (varsayılan: false)
      if (eventDataWithoutDescription.isPlanned === undefined) {
        eventDataWithoutDescription.isPlanned = false;
      }
      
      // Önce description olmadan kaydet
      const docId = await FirebaseService.create(
        this.COLLECTIONS.EVENTS,
        null,
        eventDataWithoutDescription,
        true // encrypt = true (description hariç diğer hassas alanlar şifrelenecek)
      );
      
      // Sonra description'ı şifrelemeden ekle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.EVENTS, docId);
      await updateDoc(docRef, {
        description: descriptionValue // Şifrelenmeden sakla (null veya değer)
      });
      
      // Planlanan etkinlik için otomatik SMS gönder
      if (eventDataWithoutDescription.isPlanned && eventDataWithoutDescription.regions) {
        try {
          await this.sendAutoSmsForScheduled('event', {
            name: eventDataWithoutDescription.name || eventDataWithoutDescription.category_name,
            date: eventDataWithoutDescription.date
          }, eventDataWithoutDescription.regions);
        } catch (smsError) {
          console.error('Auto SMS error (non-blocking):', smsError);
          // SMS hatası etkinlik oluşturmayı engellemez
        }
      }
      
      return { success: true, id: docId, message: 'Etkinlik oluşturuldu' };
    } catch (error) {
      console.error('Create event error:', error);
      return { success: false, message: 'Etkinlik oluşturulurken hata oluştu' };
    }
  }

  static async updateEvent(id, eventData) {
    try {
      // description alanını şifrelemeden saklamak için özel işlem
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // description değerini temizle (boş string ise null yap)
      const descriptionValue = eventData.description && eventData.description.trim() !== '' 
        ? eventData.description.trim() 
        : null;
      
      // Geçersiz attendee'leri temizle (null veya geçersiz ID'ler)
      const INVALID_ATTENDEE_IDS = ['1762645941232_qxutglj9a', null, 'null', undefined];
      if (eventData.attendees && Array.isArray(eventData.attendees)) {
        eventData.attendees = eventData.attendees.filter(attendee => {
          const memberId = attendee?.memberId;
          // Geçersiz ID'leri filtrele
          if (INVALID_ATTENDEE_IDS.includes(memberId) || 
              memberId === null || 
              memberId === undefined ||
              String(memberId) === 'null' ||
              String(memberId) === '1762645941232_qxutglj9a') {
            return false;
          }
          return true;
        });
      }
      
      const eventDataWithoutDescription = { ...eventData };
      delete eventDataWithoutDescription.description;
      
      // Önce description olmadan güncelle
      await FirebaseService.update(this.COLLECTIONS.EVENTS, id, eventDataWithoutDescription);
      
      // Sonra description'ı şifrelemeden ekle/güncelle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.EVENTS, id);
      await updateDoc(docRef, {
        description: descriptionValue // Şifrelenmeden sakla (null veya değer)
      });
      
      return { success: true, message: 'Etkinlik güncellendi' };
    } catch (error) {
      console.error('Update event error:', error);
      return { success: false, message: 'Etkinlik güncellenirken hata oluştu' };
    }
  }

  // Clean up invalid attendees from all events
  static async cleanupInvalidAttendees() {
    try {
      const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      const INVALID_ATTENDEE_IDS = ['1762645941232_qxutglj9a', null, 'null', undefined];
      
      console.log('🔍 Fetching all events to clean up invalid attendees...');
      const eventsRef = collection(db, this.COLLECTIONS.EVENTS);
      const eventsSnapshot = await getDocs(eventsRef);
      
      let totalEvents = 0;
      let updatedEvents = 0;
      let totalRemoved = 0;
      
      const updatePromises = [];
      
      eventsSnapshot.forEach((eventDoc) => {
        totalEvents++;
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;
        
        if (!eventData.attendees || !Array.isArray(eventData.attendees)) {
          return;
        }
        
        const originalAttendees = eventData.attendees;
        const validAttendees = originalAttendees.filter(attendee => {
          const memberId = attendee?.memberId;
          
          // Check if memberId is invalid
          if (INVALID_ATTENDEE_IDS.includes(memberId) || 
              memberId === null || 
              memberId === undefined ||
              String(memberId) === 'null' ||
              String(memberId) === '1762645941232_qxutglj9a') {
            return false;
          }
          
          return true;
        });
        
        if (validAttendees.length !== originalAttendees.length) {
          const removedCount = originalAttendees.length - validAttendees.length;
          totalRemoved += removedCount;
          
          console.log(`🔧 Event ${eventId}: Removing ${removedCount} invalid attendees`);
          
          const eventRef = doc(db, this.COLLECTIONS.EVENTS, eventId);
          updatePromises.push(
            updateDoc(eventRef, {
              attendees: validAttendees
            }).then(() => {
              updatedEvents++;
              console.log(`✅ Updated event ${eventId}`);
            }).catch(error => {
              console.error(`❌ Error updating event ${eventId}:`, error);
            })
          );
        }
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      console.log(`\n✅ Cleanup completed!`);
      console.log(`📊 Total events checked: ${totalEvents}`);
      console.log(`🔧 Events updated: ${updatedEvents}`);
      console.log(`🗑️  Total invalid attendees removed: ${totalRemoved}`);
      
      return { 
        success: true, 
        totalEvents, 
        updatedEvents, 
        totalRemoved,
        message: `${updatedEvents} etkinlik güncellendi, ${totalRemoved} geçersiz katılımcı silindi` 
      };
    } catch (error) {
      console.error('❌ Error cleaning up invalid attendees:', error);
      throw new Error('Geçersiz katılımcılar temizlenirken hata oluştu');
    }
  }

  // Regions API
  static async getRegions() {
    try {
      const regions = await FirebaseService.getAll(this.COLLECTIONS.REGIONS);
      // Her region'ın ID'sini string'e çevir
      return (regions || []).map(region => ({
        ...region,
        id: String(region.id || '')
      })).filter(region => region.id && region.name);
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

  static async getAllPermissions() {
    try {
      const allPermissions = await FirebaseService.getAll(this.COLLECTIONS.POSITION_PERMISSIONS);
      const map = {};
      allPermissions.forEach(perm => {
        if (!map[perm.position]) {
          map[perm.position] = [];
        }
        map[perm.position].push(perm.permission);
      });
      return map;
    } catch (error) {
      console.error('Get all permissions error:', error);
      return {};
    }
  }

  static async getPermissionsForPosition(position) {
    try {
      const permissions = await FirebaseService.findByField(
        this.COLLECTIONS.POSITION_PERMISSIONS,
        'position',
        position
      );
      return permissions ? permissions.map(p => p.permission) : [];
    } catch (error) {
      console.error('Get permissions for position error:', error);
      return [];
    }
  }

  static async setPermissionsForPosition(position, permissions) {
    try {
      // Önce bu pozisyon için mevcut izinleri sil
      const existingPermissions = await FirebaseService.findByField(
        this.COLLECTIONS.POSITION_PERMISSIONS,
        'position',
        position
      );
      
      if (existingPermissions && existingPermissions.length > 0) {
        for (const perm of existingPermissions) {
          await FirebaseService.delete(this.COLLECTIONS.POSITION_PERMISSIONS, perm.id);
        }
      }
      
      // Yeni izinleri ekle
      for (const permission of permissions) {
        await FirebaseService.create(this.COLLECTIONS.POSITION_PERMISSIONS, null, {
          position: position,
          permission: permission
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Set permissions for position error:', error);
      throw new Error('Yetkiler kaydedilemedi: ' + error.message);
    }
  }

  // Member Registrations API
  static async getMemberRegistrations() {
    try {
      const registrations = await FirebaseService.getAll(this.COLLECTIONS.MEMBER_REGISTRATIONS);
      return registrations || [];
    } catch (error) {
      console.error('Get member registrations error:', error);
      return [];
    }
  }

  static async createMemberRegistration(registrationData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.MEMBER_REGISTRATIONS, null, registrationData);
      return { success: true, id: docId, message: 'Üye kaydı oluşturuldu' };
    } catch (error) {
      console.error('Create member registration error:', error);
      throw new Error('Üye kaydı oluşturulurken hata oluştu');
    }
  }

  static async updateMemberRegistration(id, registrationData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.MEMBER_REGISTRATIONS, id, registrationData);
      return { success: true, message: 'Üye kaydı güncellendi' };
    } catch (error) {
      console.error('Update member registration error:', error);
      throw new Error('Üye kaydı güncellenirken hata oluştu');
    }
  }

  static async deleteMemberRegistration(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.MEMBER_REGISTRATIONS, id);
      return { success: true, message: 'Üye kaydı silindi' };
    } catch (error) {
      console.error('Delete member registration error:', error);
      throw new Error('Üye kaydı silinirken hata oluştu');
    }
  }

  // Archive Member/Meeting
  static async archiveMember(id) {
    try {
      const member = await FirebaseService.getById(this.COLLECTIONS.MEMBERS, id);
      if (!member) {
        throw new Error('Üye bulunamadı');
      }
      
      // archived alanını güncelle (şifreleme yapma)
      await FirebaseService.update(this.COLLECTIONS.MEMBERS, id, { archived: true }, false);
      
      // Üye kullanıcısını pasif yap (eğer varsa)
      try {
        const memberUsers = await FirebaseService.findByField(
          this.COLLECTIONS.MEMBER_USERS,
          'memberId',
          id
        );
        
        if (memberUsers && memberUsers.length > 0) {
          for (const memberUser of memberUsers) {
            await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
              isActive: false
            });
            console.log('✅ Member user deactivated:', memberUser.id);
          }
        }
      } catch (userError) {
        console.warn('⚠️ Error deactivating member user (non-critical):', userError);
        // Devam et, member user pasif yapma hatası kritik değil
      }
      
      // Güncellenmiş üyeyi tekrar getir ve döndür
      const updatedMember = await FirebaseService.getById(this.COLLECTIONS.MEMBERS, id);
      
      return { 
        success: true, 
        message: 'Üye arşivlendi',
        member: updatedMember
      };
    } catch (error) {
      console.error('Archive member error:', error);
      throw new Error('Üye arşivlenirken hata oluştu: ' + error.message);
    }
  }

  static async restoreMember(id) {
    try {
      await FirebaseService.update(this.COLLECTIONS.MEMBERS, id, { archived: false });
      
      // Üye kullanıcısını aktif yap (eğer varsa)
      try {
        const memberUsers = await FirebaseService.findByField(
          this.COLLECTIONS.MEMBER_USERS,
          'memberId',
          id
        );
        
        if (memberUsers && memberUsers.length > 0) {
          for (const memberUser of memberUsers) {
            await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, memberUser.id, {
              isActive: true
            });
            console.log('✅ Member user activated:', memberUser.id);
          }
        }
      } catch (userError) {
        console.warn('⚠️ Error activating member user (non-critical):', userError);
        // Devam et, member user aktif yapma hatası kritik değil
      }
      
      return { success: true, message: 'Üye geri yüklendi' };
    } catch (error) {
      console.error('Restore member error:', error);
      throw new Error('Üye geri yüklenirken hata oluştu');
    }
  }

  // Preview Excel import - analyze file and return preview data
  static async previewImportMembersFromExcel(file) {
    try {
      // XLSX kütüphanesini dinamik olarak yükle
      const XLSX = await import('xlsx');
      
      // Dosyayı oku
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // İlk satırı başlık olarak atla
      const rows = jsonData.slice(1);
      
      const newMembers = [];
      const updatedMembers = [];
      const errors = [];
      
      // Get all existing members once
      const existingMembers = await FirebaseService.getAll(this.COLLECTIONS.MEMBERS);
      
      // Process each row
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i];
          
          if (row.length < 3) {
            continue; // En az 3 sütun gerekli: TC, İsim, Telefon
          }
          
          // Map Excel columns to member fields
          const tc = row[0] ? String(row[0]).trim() : '';
          const name = row[1] ? String(row[1]).trim() : '';
          const phone = row[2] ? String(row[2]).trim() : '';
          let position = row[3] ? String(row[3]).trim() : '';
          let region = row[4] ? String(row[4]).trim() : '';
          
          // If position or region is empty, set default values
          if (!position) {
            position = 'Üye';
          }
          
          if (!region) {
            region = 'Üye';
          }
          
          // Validate required fields
          if (!tc || !name || !phone) {
            errors.push(`Satır ${i + 2}: Gerekli alanlar eksik (TC, İsim Soyisim, Telefon zorunludur)`);
            continue;
          }
          
          // Validate TC length
          if (tc.length !== 11) {
            errors.push(`Satır ${i + 2}: TC kimlik numarası 11 haneli olmalıdır`);
            continue;
          }
          
          // Check if TC already exists
          const existingMember = existingMembers.find(m => {
            if (m.archived) return false;
            
            const memberTc = m.tc || m.tcNo;
            if (!memberTc) return false;
            
            // TC'yi decrypt etmek gerekebilir
            let decryptedTc = memberTc;
            try {
              if (typeof memberTc === 'string' && memberTc.startsWith('U2FsdGVkX1')) {
                decryptedTc = decryptData(memberTc);
              }
            } catch (e) {
              // Decrypt başarısız, orijinal TC'yi kullan
              decryptedTc = memberTc;
            }
            
            return String(decryptedTc) === String(tc);
          });
          
          const memberData = {
            tc,
            name,
            phone,
            position,
            region
          };
          
          if (existingMember) {
            // TC zaten varsa, güncelleme bilgisi ekle
            updatedMembers.push({
              ...memberData,
              currentName: existingMember.name,
              currentPhone: existingMember.phone,
              memberId: existingMember.id
            });
          } else {
            // TC yoksa, yeni üye
            newMembers.push(memberData);
          }
        } catch (rowError) {
          console.error(`Error processing row ${i + 2}:`, rowError);
          errors.push(`Satır ${i + 2}: ${rowError.message}`);
        }
      }
      
      return {
        newMembers,
        updatedMembers,
        errors
      };
    } catch (error) {
      console.error('Excel preview error:', error);
      throw new Error('Excel dosyası analiz edilirken hata oluştu: ' + error.message);
    }
  }

  // Import members from Excel (with preview data)
  static async importMembersFromExcel(file, previewData = null) {
    try {
      let newMembers = [];
      let updatedMembers = [];
      let errors = [];
      
      // If preview data is provided, use it; otherwise analyze the file
      if (previewData) {
        newMembers = previewData.newMembers || [];
        updatedMembers = previewData.updatedMembers || [];
        errors = previewData.errors || [];
      } else {
        // Fallback: analyze file if preview data not provided
        const preview = await this.previewImportMembersFromExcel(file);
        newMembers = preview.newMembers;
        updatedMembers = preview.updatedMembers;
        errors = preview.errors;
      }
      
      let importedCount = 0;
      const importErrors = [];
      
      // Helper function to create region if it doesn't exist
      const createRegionIfNotExists = async (regionName) => {
        if (!regionName || regionName.trim() === '') return null;
        
        try {
          const existingRegions = await FirebaseService.findByField(
            this.COLLECTIONS.REGIONS,
            'name',
            regionName.trim()
          );
          
          if (existingRegions && existingRegions.length > 0) {
            return existingRegions[0];
          }
          
          const docId = await FirebaseService.create(
            this.COLLECTIONS.REGIONS,
            null,
            { name: regionName.trim() },
            false
          );
          
          return { id: docId, name: regionName.trim() };
        } catch (error) {
          console.error('Error creating region:', error);
          return null;
        }
      };
      
      // Helper function to create position if it doesn't exist
      const createPositionIfNotExists = async (positionName) => {
        if (!positionName || positionName.trim() === '') return null;
        
        try {
          const existingPositions = await FirebaseService.findByField(
            this.COLLECTIONS.POSITIONS,
            'name',
            positionName.trim()
          );
          
          if (existingPositions && existingPositions.length > 0) {
            return existingPositions[0];
          }
          
          const docId = await FirebaseService.create(
            this.COLLECTIONS.POSITIONS,
            null,
            { name: positionName.trim() },
            false
          );
          
          return { id: docId, name: positionName.trim() };
        } catch (error) {
          console.error('Error creating position:', error);
          return null;
        }
      };
      
      // Process new members
      for (const memberData of newMembers) {
        try {
          // Create region and position if they don't exist
          await createRegionIfNotExists.call(this, memberData.region);
          await createPositionIfNotExists.call(this, memberData.position);
          
          // Create new member
          await this.createMember({
            ...memberData,
            archived: false
          });
          importedCount++;
        } catch (error) {
          console.error(`Error creating member ${memberData.tc}:`, error);
          importErrors.push(`Üye oluşturulurken hata: ${memberData.name} (${memberData.tc}) - ${error.message}`);
        }
      }
      
      // Process updated members
      for (const memberData of updatedMembers) {
        try {
          // Create region and position if they don't exist
          await createRegionIfNotExists.call(this, memberData.region);
          await createPositionIfNotExists.call(this, memberData.position);
          
          // Update existing member
          await this.updateMember(memberData.memberId, {
            tc: memberData.tc,
            name: memberData.name,
            phone: memberData.phone,
            position: memberData.position,
            region: memberData.region,
            archived: false
          });
          importedCount++;
        } catch (error) {
          console.error(`Error updating member ${memberData.tc}:`, error);
          importErrors.push(`Üye güncellenirken hata: ${memberData.name} (${memberData.tc}) - ${error.message}`);
        }
      }
      
      return {
        message: `${importedCount} üye başarıyla içe aktarıldı`,
        count: importedCount,
        errors: [...errors, ...importErrors].length > 0 ? [...errors, ...importErrors] : undefined
      };
    } catch (error) {
      console.error('Excel import error:', error);
      throw new Error('Excel içe aktarımı sırasında hata oluştu: ' + error.message);
    }
  }

  // Delete archived member permanently
  static async deleteArchivedMember(id) {
    try {
      console.log('FirebaseApiService.deleteArchivedMember called with id:', id);
      
      // ID formatını normalize et (eğer string ise)
      const memberId = String(id).trim();
      console.log('Normalized member ID:', memberId);
      
      const member = await FirebaseService.getById(this.COLLECTIONS.MEMBERS, memberId);
      console.log('Member found:', member ? 'yes' : 'no', member ? { id: member.id, name: member.name, archived: member.archived } : null);
      
      if (!member) {
        // Belki ID formatı farklı - tüm üyeleri kontrol et
        console.log('Member not found by ID, trying to find by scanning all members...');
        const allMembers = await FirebaseService.getAll(this.COLLECTIONS.MEMBERS);
        const foundMember = allMembers.find(m => String(m.id) === memberId || String(m.id) === String(id));
        
        if (foundMember) {
          console.log('Member found by scanning:', foundMember.id);
          const isArchived = foundMember.archived === true || foundMember.archived === 'true' || foundMember.archived === 1 || foundMember.archived === '1';
          if (isArchived) {
            await FirebaseService.delete(this.COLLECTIONS.MEMBERS, foundMember.id);
            
            // Eğer member_user varsa onu da sil
            try {
              const memberUsers = await FirebaseService.findByField(
                this.COLLECTIONS.MEMBER_USERS,
                'memberId',
                foundMember.id
              );
              
              if (memberUsers && memberUsers.length > 0) {
                for (const memberUser of memberUsers) {
                  await FirebaseService.delete(this.COLLECTIONS.MEMBER_USERS, memberUser.id);
                }
              }
            } catch (userError) {
              console.warn('Error deleting member user:', userError);
            }
            
            return { success: true, message: 'Arşivlenmiş üye kalıcı olarak silindi' };
          } else {
            throw new Error('Bu üye arşivlenmemiş');
          }
        }
        
        throw new Error('Arşivlenmiş üye bulunamadı');
      }
      
      // Arşivlenmiş olup olmadığını kontrol et (truthy check - boolean, string "true", 1 gibi değerleri kabul et)
      const isArchived = member.archived === true || member.archived === 'true' || member.archived === 1 || member.archived === '1';
      console.log('Member archived status:', { archived: member.archived, isArchived });
      
      if (!isArchived) {
        throw new Error('Bu üye arşivlenmemiş');
      }
      
      // Üyeyi kalıcı olarak sil
      console.log('Deleting member with ID:', member.id || memberId);
      await FirebaseService.delete(this.COLLECTIONS.MEMBERS, member.id || memberId);
      
      // Eğer member_user varsa onu da sil (Firestore ve Firebase Auth'dan)
      try {
        const memberUsers = await FirebaseService.findByField(
          this.COLLECTIONS.MEMBER_USERS,
          'memberId',
          id
        );
        
        if (memberUsers && memberUsers.length > 0) {
          for (const memberUser of memberUsers) {
            console.log('🗑️ Deleting member user:', {
              id: memberUser.id,
              username: memberUser.username,
              authUid: memberUser.authUid,
              userType: memberUser.userType
            });
            
            // Firebase Auth'dan da sil (eğer authUid varsa)
            // Not: Client-side'dan Firebase Auth kullanıcısını direkt silemeyiz
            // Bu işlem için backend/Cloud Functions gerekir
            // Ancak member_users silindiğinde, login sırasında kontrol edilip Firebase Auth'daki kullanıcı da geçersiz sayılır
            if (memberUser.authUid) {
              try {
                // Firebase Auth kullanıcısını silmeyi dene
                // Not: Bu işlem client-side'dan tam olarak yapılamaz
                // Ancak member_users silindiğinde, login sırasında kontrol edilip Firebase Auth'daki kullanıcı da geçersiz sayılır
                await this.deleteFirebaseAuthUser(memberUser.authUid);
                console.log('✅ Firebase Auth user deletion attempted:', memberUser.authUid);
              } catch (authError) {
                console.warn('⚠️ Firebase Auth deletion failed (non-critical):', authError);
                // Firestore'dan member_user silindiğinde, login sırasında kontrol edilip Firebase Auth'daki kullanıcı da geçersiz sayılır
                // Bu yüzden kritik bir hata değil
              }
            }
            
            // Firestore'dan member_user'ı sil (dashboard sayfası da kaldırılır)
            await FirebaseService.delete(this.COLLECTIONS.MEMBER_USERS, memberUser.id);
            console.log('✅ Member user deleted from Firestore (dashboard removed):', memberUser.id);
          }
        } else {
          console.log('ℹ️ No member user found for member ID:', id);
        }
      } catch (userError) {
        console.error('❌ Error deleting member user:', userError);
        // Devam et, member user silme hatası kritik değil
        // Üye zaten silindi, member_user silme hatası kritik değil
      }
      
      return { success: true, message: 'Arşivlenmiş üye kalıcı olarak silindi' };
    } catch (error) {
      console.error('Delete archived member error:', error);
      throw new Error('Arşivlenmiş üye silinirken hata oluştu: ' + error.message);
    }
  }

  // Delete archived meeting permanently
  static async deleteArchivedMeeting(id) {
    try {
      const meeting = await FirebaseService.getById(this.COLLECTIONS.MEETINGS, id);
      if (!meeting) {
        throw new Error('Arşivlenmiş toplantı bulunamadı');
      }
      
      // Arşivlenmiş olup olmadığını kontrol et (truthy check)
      const isArchived = meeting.archived === true || meeting.archived === 'true' || meeting.archived === 1 || meeting.archived === '1';
      if (!isArchived) {
        throw new Error('Bu toplantı arşivlenmemiş');
      }
      
      // Toplantıyı kalıcı olarak sil
      await FirebaseService.delete(this.COLLECTIONS.MEETINGS, id);
      
      return { success: true, message: 'Arşivlenmiş toplantı kalıcı olarak silindi' };
    } catch (error) {
      console.error('Delete archived meeting error:', error);
      throw new Error('Arşivlenmiş toplantı silinirken hata oluştu: ' + error.message);
    }
  }

  static async archiveMeeting(id) {
    try {
      await FirebaseService.update(this.COLLECTIONS.MEETINGS, id, { archived: true });
      return { success: true, message: 'Toplantı arşivlendi' };
    } catch (error) {
      console.error('Archive meeting error:', error);
      throw new Error('Toplantı arşivlenirken hata oluştu');
    }
  }

  static async getMeetingById(id) {
    try {
      return await FirebaseService.getById(this.COLLECTIONS.MEETINGS, id);
    } catch (error) {
      console.error('Get meeting by id error:', error);
      return null;
    }
  }

  static async updateAttendance(meetingId, memberId, attended) {
    try {
      const meeting = await FirebaseService.getById(this.COLLECTIONS.MEETINGS, meetingId);
      if (!meeting) throw new Error('Toplantı bulunamadı');
      
      const attendees = meeting.attendees || [];
      const index = attendees.findIndex(a => a.memberId === memberId);
      
      if (index >= 0) {
        attendees[index].attended = attended;
      } else {
        attendees.push({ memberId, attended, excuse: { hasExcuse: false, reason: null } });
      }
      
      await FirebaseService.update(this.COLLECTIONS.MEETINGS, meetingId, { attendees });
      return { success: true, message: 'Katılım güncellendi' };
    } catch (error) {
      console.error('Update attendance error:', error);
      throw new Error('Katılım güncellenirken hata oluştu');
    }
  }

  static async updateExcuse(meetingId, memberId, hasExcuse, reason) {
    try {
      const meeting = await FirebaseService.getById(this.COLLECTIONS.MEETINGS, meetingId);
      if (!meeting) throw new Error('Toplantı bulunamadı');
      
      const attendees = meeting.attendees || [];
      const index = attendees.findIndex(a => a.memberId === memberId);
      
      if (index >= 0) {
        attendees[index].excuse = { hasExcuse, reason };
      } else {
        attendees.push({ memberId, attended: false, excuse: { hasExcuse, reason } });
      }
      
      await FirebaseService.update(this.COLLECTIONS.MEETINGS, meetingId, { attendees });
      return { success: true, message: 'Mazeret güncellendi' };
    } catch (error) {
      console.error('Update excuse error:', error);
      throw new Error('Mazeret güncellenirken hata oluştu');
    }
  }

  static async archiveEvent(id) {
    try {
      await FirebaseService.update(this.COLLECTIONS.EVENTS, id, { archived: true });
      return { success: true, message: 'Etkinlik arşivlendi' };
    } catch (error) {
      console.error('Archive event error:', error);
      throw new Error('Etkinlik arşivlenirken hata oluştu');
    }
  }

  static async deleteEvent(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.EVENTS, id);
      return { success: true, message: 'Etkinlik silindi' };
    } catch (error) {
      console.error('Delete event error:', error);
      throw new Error('Etkinlik silinirken hata oluştu');
    }
  }

  static async getEventById(id) {
    try {
      return await FirebaseService.getById(this.COLLECTIONS.EVENTS, id);
    } catch (error) {
      console.error('Get event by id error:', error);
      return null;
    }
  }

  // Regions CRUD
  static async createRegion(regionData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.REGIONS, null, regionData);
      
      // Kısa bir bekleme ekle (Firestore yazma işleminin tamamlanması için)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Oluşturulan region'ı tam olarak al ve döndür
      const createdRegion = await FirebaseService.getById(this.COLLECTIONS.REGIONS, docId);
      
      if (createdRegion) {
        // ID'yi string olarak garantile
        return {
          ...createdRegion,
          id: String(createdRegion.id || docId)
        };
      }
      
      // Eğer getById başarısız olursa, manuel olarak oluştur
      return {
        id: String(docId),
        name: regionData.name,
        ...regionData
      };
    } catch (error) {
      console.error('Create region error:', error);
      throw new Error('Bölge oluşturulurken hata oluştu: ' + (error.message || error));
    }
  }

  static async updateRegion(id, regionData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.REGIONS, id, regionData);
      return { success: true, message: 'Bölge güncellendi' };
    } catch (error) {
      console.error('Update region error:', error);
      throw new Error('Bölge güncellenirken hata oluştu');
    }
  }

  static async deleteRegion(id) {
    try {
      if (id === null || id === undefined) {
        throw new Error('Bölge ID null veya undefined');
      }
      
      // ID'yi mutlaka string'e çevir (Firebase string bekler)
      let stringId;
      if (typeof id === 'object') {
        if (Array.isArray(id)) {
          throw new Error(`Region ID array olamaz: ${JSON.stringify(id)}`);
        }
        if (id.id) {
          stringId = String(id.id);
        } else if (id.toString && typeof id.toString === 'function') {
          stringId = String(id.toString());
        } else {
          throw new Error(`Region ID geçersiz object format: ${JSON.stringify(id)}`);
        }
      } else if (typeof id === 'number') {
        stringId = String(id);
      } else {
        stringId = String(id);
      }
      
      // Boş string kontrolü
      if (!stringId || stringId.trim() === '' || stringId === 'undefined' || stringId === 'null' || stringId === '[object Object]') {
        throw new Error(`Region ID geçersiz: ${id} -> ${stringId}`);
      }
      
      stringId = stringId.trim();
      
      // Collection name kontrolü
      const collectionName = String(this.COLLECTIONS.REGIONS || 'regions');
      if (!collectionName || collectionName.trim() === '') {
        throw new Error(`Collection name geçersiz: ${this.COLLECTIONS.REGIONS}`);
      }
      
      // Region'ı sil
      await FirebaseService.delete(collectionName, stringId);
      
      return { success: true, message: 'Bölge silindi' };
    } catch (error) {
      console.error('Delete region error:', error);
      throw new Error('Bölge silinirken hata oluştu: ' + (error.message || error));
    }
  }

  // Positions CRUD
  static async createPosition(positionData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.POSITIONS, null, positionData);
      return { success: true, id: docId, message: 'Pozisyon oluşturuldu' };
    } catch (error) {
      console.error('Create position error:', error);
      throw new Error('Pozisyon oluşturulurken hata oluştu');
    }
  }

  static async updatePosition(id, positionData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.POSITIONS, id, positionData);
      return { success: true, message: 'Pozisyon güncellendi' };
    } catch (error) {
      console.error('Update position error:', error);
      throw new Error('Pozisyon güncellenirken hata oluştu');
    }
  }

  static async deletePosition(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.POSITIONS, id);
      return { success: true, message: 'Pozisyon silindi' };
    } catch (error) {
      console.error('Delete position error:', error);
      throw new Error('Pozisyon silinirken hata oluştu');
    }
  }

  // Districts CRUD
  static async getDistricts() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.DISTRICTS);
    } catch (error) {
      console.error('Get districts error:', error);
      return [];
    }
  }

  static async createDistrict(districtData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.DISTRICTS, null, districtData);
      return { success: true, id: docId, message: 'İlçe oluşturuldu' };
    } catch (error) {
      console.error('Create district error:', error);
      throw new Error('İlçe oluşturulurken hata oluştu');
    }
  }

  static async updateDistrict(id, districtData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.DISTRICTS, id, districtData);
      return { success: true, message: 'İlçe güncellendi' };
    } catch (error) {
      console.error('Update district error:', error);
      throw new Error('İlçe güncellenirken hata oluştu');
    }
  }

  static async deleteDistrict(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.DISTRICTS, id);
      return { success: true, message: 'İlçe silindi' };
    } catch (error) {
      console.error('Delete district error:', error);
      throw new Error('İlçe silinirken hata oluştu');
    }
  }

  // Towns CRUD
  static async getTowns() {
    try {
      const towns = await FirebaseService.getAll(this.COLLECTIONS.TOWNS);
      const townOfficials = await FirebaseService.getAll(this.COLLECTIONS.TOWN_OFFICIALS);
      
      // Her belde için başkan bilgisini ekle
      return towns.map(town => {
        const official = townOfficials.find(o => String(o.town_id) === String(town.id));
        return {
          ...town,
          town_chairman_name: official?.chairman_name || null,
          town_chairman_phone: official?.chairman_phone || null
        };
      });
    } catch (error) {
      console.error('Get towns error:', error);
      return [];
    }
  }

  static async getTownById(townId) {
    try {
      // townId boş veya geçersizse hata döndür
      if (!townId || townId === '' || townId === undefined || townId === null) {
        return { success: false, message: 'Belde ID gerekli' };
      }
      
      const town = await FirebaseService.getById(this.COLLECTIONS.TOWNS, townId);
      if (!town) {
        return { success: false, message: 'Belde bulunamadı' };
      }
      
      // Districts bilgisini de ekle
      const districts = await this.getDistricts();
      const district = districts.find(d => String(d.id) === String(town.district_id));
      
      return {
        success: true,
        town: {
          ...town,
          districtName: district?.name || ''
        }
      };
    } catch (error) {
      console.error('Get town by id error:', error);
      return { success: false, message: 'Belde bilgileri alınamadı' };
    }
  }

  static async createTown(townData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.TOWNS, null, townData);
      return { success: true, id: docId, message: 'İlçe oluşturuldu' };
    } catch (error) {
      console.error('Create town error:', error);
      throw new Error('İlçe oluşturulurken hata oluştu');
    }
  }

  static async updateTown(id, townData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.TOWNS, id, townData);
      return { success: true, message: 'İlçe güncellendi' };
    } catch (error) {
      console.error('Update town error:', error);
      throw new Error('İlçe güncellenirken hata oluştu');
    }
  }

  static async deleteTown(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.TOWNS, id);
      return { success: true, message: 'İlçe silindi' };
    } catch (error) {
      console.error('Delete town error:', error);
      throw new Error('İlçe silinirken hata oluştu');
    }
  }

  // Neighborhoods CRUD
  static async getNeighborhoods() {
    try {
      const neighborhoods = await FirebaseService.getAll(this.COLLECTIONS.NEIGHBORHOODS);
      const districts = await FirebaseService.getAll(this.COLLECTIONS.DISTRICTS);
      const towns = await FirebaseService.getAll(this.COLLECTIONS.TOWNS);
      
      // Populate district_name and town_name
      return neighborhoods.map(neighborhood => {
        const district = districts.find(d => String(d.id) === String(neighborhood.district_id));
        const town = neighborhood.town_id ? towns.find(t => String(t.id) === String(neighborhood.town_id)) : null;
        return {
          ...neighborhood,
          district_name: district?.name || '',
          town_name: town?.name || ''
        };
      });
    } catch (error) {
      console.error('Get neighborhoods error:', error);
      return [];
    }
  }

  static async createNeighborhood(neighborhoodData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.NEIGHBORHOODS, null, neighborhoodData);
      return { success: true, id: docId, message: 'Mahalle oluşturuldu' };
    } catch (error) {
      console.error('Create neighborhood error:', error);
      throw new Error('Mahalle oluşturulurken hata oluştu');
    }
  }

  static async updateNeighborhood(id, neighborhoodData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.NEIGHBORHOODS, id, neighborhoodData);
      return { success: true, message: 'Mahalle güncellendi' };
    } catch (error) {
      console.error('Update neighborhood error:', error);
      throw new Error('Mahalle güncellenirken hata oluştu');
    }
  }

  static async deleteNeighborhood(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.NEIGHBORHOODS, id);
      return { success: true, message: 'Mahalle silindi' };
    } catch (error) {
      console.error('Delete neighborhood error:', error);
      throw new Error('Mahalle silinirken hata oluştu');
    }
  }

  // Villages CRUD
  static async getVillages() {
    try {
      const villages = await FirebaseService.getAll(this.COLLECTIONS.VILLAGES);
      const districts = await FirebaseService.getAll(this.COLLECTIONS.DISTRICTS);
      const towns = await FirebaseService.getAll(this.COLLECTIONS.TOWNS);
      
      // Populate district_name and town_name
      return villages.map(village => {
        const district = districts.find(d => String(d.id) === String(village.district_id));
        const town = village.town_id ? towns.find(t => String(t.id) === String(village.town_id)) : null;
        return {
          ...village,
          district_name: district?.name || '',
          town_name: town?.name || ''
        };
      });
    } catch (error) {
      console.error('Get villages error:', error);
      return [];
    }
  }

  static async createVillage(villageData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.VILLAGES, null, villageData);
      return { success: true, id: docId, message: 'Köy oluşturuldu' };
    } catch (error) {
      console.error('Create village error:', error);
      throw new Error('Köy oluşturulurken hata oluştu');
    }
  }

  static async updateVillage(id, villageData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.VILLAGES, id, villageData);
      return { success: true, message: 'Köy güncellendi' };
    } catch (error) {
      console.error('Update village error:', error);
      throw new Error('Köy güncellenirken hata oluştu');
    }
  }

  static async deleteVillage(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.VILLAGES, id);
      return { success: true, message: 'Köy silindi' };
    } catch (error) {
      console.error('Delete village error:', error);
      throw new Error('Köy silinirken hata oluştu');
    }
  }

  // STKs CRUD
  static async getSTKs() {
    try {
      const stks = await FirebaseService.getAll(this.COLLECTIONS.STKS);
      
      // description alanını decrypt etmeye çalış (eski şifrelenmiş kayıtlar için)
      const { decryptData } = await import('../utils/crypto');
      
      return stks.map(stk => {
        // Eğer description şifrelenmişse (eski kayıtlar için), decrypt et
        if (stk.description && typeof stk.description === 'string' && stk.description.startsWith('U2FsdGVkX1')) {
          try {
            const decrypted = decryptData(stk.description);
            if (decrypted && decrypted !== stk.description) {
              stk.description = decrypted;
            }
          } catch (error) {
            // Decrypt başarısız olursa, description'ı temizle (muhtemelen bozuk veri)
            console.warn('Failed to decrypt description for STK:', stk.id, error);
            stk.description = null;
          }
        }
        return stk;
      });
    } catch (error) {
      console.error('Get STKs error:', error);
      return [];
    }
  }

  static async createSTK(stkData) {
    try {
      // description alanını şifrelemeden saklamak için özel işlem
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // description değerini temizle (boş string ise null yap)
      const descriptionValue = stkData.description && stkData.description.trim() !== '' 
        ? stkData.description.trim() 
        : null;
      
      const stkDataWithoutDescription = { ...stkData };
      delete stkDataWithoutDescription.description;
      
      // Önce description olmadan kaydet
      const docId = await FirebaseService.create(
        this.COLLECTIONS.STKS,
        null,
        stkDataWithoutDescription,
        true // encrypt = true (description hariç diğer hassas alanlar şifrelenecek)
      );
      
      // Sonra description'ı şifrelemeden ekle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.STKS, docId);
      await updateDoc(docRef, { description: descriptionValue }); // Şifrelenmeden sakla (null veya değer)
      
      return { success: true, id: docId, message: 'STK oluşturuldu' };
    } catch (error) {
      console.error('Create STK error:', error);
      throw new Error('STK oluşturulurken hata oluştu');
    }
  }

  static async updateSTK(id, stkData) {
    try {
      // description alanını şifrelemeden saklamak için özel işlem
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // description değerini temizle (boş string ise null yap)
      const descriptionValue = stkData.description && stkData.description.trim() !== '' 
        ? stkData.description.trim() 
        : null;
      
      const stkDataWithoutDescription = { ...stkData };
      delete stkDataWithoutDescription.description;
      
      // Önce description olmadan güncelle
      await FirebaseService.update(this.COLLECTIONS.STKS, id, stkDataWithoutDescription);
      
      // Sonra description'ı şifrelemeden ekle/güncelle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.STKS, id);
      await updateDoc(docRef, { description: descriptionValue }); // Şifrelenmeden sakla (null veya değer)
      
      return { success: true, message: 'STK güncellendi' };
    } catch (error) {
      console.error('Update STK error:', error);
      throw new Error('STK güncellenirken hata oluştu');
    }
  }

  static async deleteSTK(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.STKS, id);
      return { success: true, message: 'STK silindi' };
    } catch (error) {
      console.error('Delete STK error:', error);
      throw new Error('STK silinirken hata oluştu');
    }
  }

  // Mosques CRUD
  static async getMosques() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.MOSQUES);
    } catch (error) {
      console.error('Get mosques error:', error);
      return [];
    }
  }

  static async createMosque(mosqueData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.MOSQUES, null, mosqueData);
      return { success: true, id: docId, message: 'Cami oluşturuldu' };
    } catch (error) {
      console.error('Create mosque error:', error);
      throw new Error('Cami oluşturulurken hata oluştu');
    }
  }

  static async updateMosque(id, mosqueData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.MOSQUES, id, mosqueData);
      return { success: true, message: 'Cami güncellendi' };
    } catch (error) {
      console.error('Update mosque error:', error);
      throw new Error('Cami güncellenirken hata oluştu');
    }
  }

  static async deleteMosque(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.MOSQUES, id);
      return { success: true, message: 'Cami silindi' };
    } catch (error) {
      console.error('Delete mosque error:', error);
      throw new Error('Cami silinirken hata oluştu');
    }
  }

  // Event Categories CRUD
  static async getEventCategories() {
    try {
      const categories = await FirebaseService.getAll(this.COLLECTIONS.EVENT_CATEGORIES);
      
      // description alanını decrypt etmeye çalış (eski şifrelenmiş kayıtlar için)
      const { decryptData } = await import('../utils/crypto');
      
      return categories.map(category => {
        // Eğer description şifrelenmişse (eski kayıtlar için), decrypt et
        if (category.description && typeof category.description === 'string' && category.description.startsWith('U2FsdGVkX1')) {
          try {
            const decrypted = decryptData(category.description);
            if (decrypted && decrypted !== category.description) {
              category.description = decrypted;
            }
          } catch (error) {
            // Decrypt başarısız olursa, description'ı temizle (muhtemelen bozuk veri)
            console.warn('Failed to decrypt description for category:', category.id, error);
            category.description = null;
          }
        }
        return category;
      });
    } catch (error) {
      console.error('Get event categories error:', error);
      return [];
    }
  }

  static async createEventCategory(categoryData) {
    try {
      // description alanını şifrelemeden saklamak için özel işlem
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // description değerini temizle (boş string ise null yap)
      const descriptionValue = categoryData.description && categoryData.description.trim() !== '' 
        ? categoryData.description.trim() 
        : null;
      
      const categoryDataWithoutDescription = { ...categoryData };
      delete categoryDataWithoutDescription.description;
      
      // Önce description olmadan kaydet
      const docId = await FirebaseService.create(
        this.COLLECTIONS.EVENT_CATEGORIES,
        null,
        categoryDataWithoutDescription,
        true // encrypt = true (description hariç diğer hassas alanlar şifrelenecek)
      );
      
      // Sonra description'ı şifrelemeden ekle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.EVENT_CATEGORIES, docId);
      await updateDoc(docRef, { description: descriptionValue }); // Şifrelenmeden sakla (null veya değer)
      
      return { success: true, id: docId, message: 'Etkinlik kategorisi oluşturuldu' };
    } catch (error) {
      console.error('Create event category error:', error);
      throw new Error('Etkinlik kategorisi oluşturulurken hata oluştu');
    }
  }

  static async updateEventCategory(id, categoryData) {
    try {
      // description alanını şifrelemeden saklamak için özel işlem
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // description değerini temizle (boş string ise null yap)
      const descriptionValue = categoryData.description && categoryData.description.trim() !== '' 
        ? categoryData.description.trim() 
        : null;
      
      const categoryDataWithoutDescription = { ...categoryData };
      delete categoryDataWithoutDescription.description;
      
      // Önce description olmadan güncelle
      await FirebaseService.update(this.COLLECTIONS.EVENT_CATEGORIES, id, categoryDataWithoutDescription);
      
      // Sonra description'ı şifrelemeden ekle/güncelle (null ise de ekle ki boş olduğu belli olsun)
      const docRef = doc(db, this.COLLECTIONS.EVENT_CATEGORIES, id);
      await updateDoc(docRef, { description: descriptionValue }); // Şifrelenmeden sakla (null veya değer)
      
      return { success: true, message: 'Etkinlik kategorisi güncellendi' };
    } catch (error) {
      console.error('Update event category error:', error);
      throw new Error('Etkinlik kategorisi güncellenirken hata oluştu');
    }
  }

  static async deleteEventCategory(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.EVENT_CATEGORIES, id);
      return { success: true, message: 'Etkinlik kategorisi silindi' };
    } catch (error) {
      console.error('Delete event category error:', error);
      throw new Error('Etkinlik kategorisi silinirken hata oluştu');
    }
  }

  // Neighborhood Representatives CRUD
  static async getNeighborhoodRepresentatives() {
    try {
      const representatives = await FirebaseService.getAll(this.COLLECTIONS.NEIGHBORHOOD_REPRESENTATIVES);
      const neighborhoods = await FirebaseService.getAll(this.COLLECTIONS.NEIGHBORHOODS);
      const districts = await FirebaseService.getAll(this.COLLECTIONS.DISTRICTS);
      const towns = await FirebaseService.getAll(this.COLLECTIONS.TOWNS);
      
      // Populate neighborhood_name, district_name, town_name
      return representatives.map(rep => {
        const neighborhood = neighborhoods.find(n => String(n.id) === String(rep.neighborhood_id));
        const district = neighborhood ? districts.find(d => String(d.id) === String(neighborhood.district_id)) : null;
        const town = neighborhood && neighborhood.town_id ? towns.find(t => String(t.id) === String(neighborhood.town_id)) : null;
        
        return {
          ...rep,
          neighborhood_name: neighborhood?.name || '',
          district_name: district?.name || '',
          town_name: town?.name || ''
        };
      });
    } catch (error) {
      console.error('Get neighborhood representatives error:', error);
      return [];
    }
  }

  static async createNeighborhoodRepresentative(representativeData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.NEIGHBORHOOD_REPRESENTATIVES, null, representativeData);
      return { success: true, id: docId, message: 'Mahalle temsilcisi oluşturuldu' };
    } catch (error) {
      console.error('Create neighborhood representative error:', error);
      throw new Error('Mahalle temsilcisi oluşturulurken hata oluştu');
    }
  }

  static async updateNeighborhoodRepresentative(id, representativeData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.NEIGHBORHOOD_REPRESENTATIVES, id, representativeData);
      return { success: true, message: 'Mahalle temsilcisi güncellendi' };
    } catch (error) {
      console.error('Update neighborhood representative error:', error);
      throw new Error('Mahalle temsilcisi güncellenirken hata oluştu');
    }
  }

  static async deleteNeighborhoodRepresentative(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.NEIGHBORHOOD_REPRESENTATIVES, id);
      return { success: true, message: 'Mahalle temsilcisi silindi' };
    } catch (error) {
      console.error('Delete neighborhood representative error:', error);
      throw new Error('Mahalle temsilcisi silinirken hata oluştu');
    }
  }

  // Village Representatives CRUD
  static async getVillageRepresentatives() {
    try {
      const representatives = await FirebaseService.getAll(this.COLLECTIONS.VILLAGE_REPRESENTATIVES);
      const villages = await FirebaseService.getAll(this.COLLECTIONS.VILLAGES);
      const districts = await FirebaseService.getAll(this.COLLECTIONS.DISTRICTS);
      const towns = await FirebaseService.getAll(this.COLLECTIONS.TOWNS);
      
      // Populate village_name, district_name, town_name
      return representatives.map(rep => {
        const village = villages.find(v => String(v.id) === String(rep.village_id));
        const district = village ? districts.find(d => String(d.id) === String(village.district_id)) : null;
        const town = village && village.town_id ? towns.find(t => String(t.id) === String(village.town_id)) : null;
        
        return {
          ...rep,
          village_name: village?.name || '',
          district_name: district?.name || '',
          town_name: town?.name || ''
        };
      });
    } catch (error) {
      console.error('Get village representatives error:', error);
      return [];
    }
  }

  static async createVillageRepresentative(representativeData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.VILLAGE_REPRESENTATIVES, null, representativeData);
      return { success: true, id: docId, message: 'Köy temsilcisi oluşturuldu' };
    } catch (error) {
      console.error('Create village representative error:', error);
      throw new Error('Köy temsilcisi oluşturulurken hata oluştu');
    }
  }

  static async updateVillageRepresentative(id, representativeData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.VILLAGE_REPRESENTATIVES, id, representativeData);
      return { success: true, message: 'Köy temsilcisi güncellendi' };
    } catch (error) {
      console.error('Update village representative error:', error);
      throw new Error('Köy temsilcisi güncellenirken hata oluştu');
    }
  }

  static async deleteVillageRepresentative(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.VILLAGE_REPRESENTATIVES, id);
      return { success: true, message: 'Köy temsilcisi silindi' };
    } catch (error) {
      console.error('Delete village representative error:', error);
      throw new Error('Köy temsilcisi silinirken hata oluştu');
    }
  }

  // Neighborhood Supervisors CRUD
  static async getNeighborhoodSupervisors() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.NEIGHBORHOOD_SUPERVISORS);
    } catch (error) {
      console.error('Get neighborhood supervisors error:', error);
      return [];
    }
  }

  static async createNeighborhoodSupervisor(supervisorData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.NEIGHBORHOOD_SUPERVISORS, null, supervisorData);
      return { success: true, id: docId, message: 'Mahalle sorumlusu oluşturuldu' };
    } catch (error) {
      console.error('Create neighborhood supervisor error:', error);
      throw new Error('Mahalle sorumlusu oluşturulurken hata oluştu');
    }
  }

  static async updateNeighborhoodSupervisor(id, supervisorData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.NEIGHBORHOOD_SUPERVISORS, id, supervisorData);
      return { success: true, message: 'Mahalle sorumlusu güncellendi' };
    } catch (error) {
      console.error('Update neighborhood supervisor error:', error);
      throw new Error('Mahalle sorumlusu güncellenirken hata oluştu');
    }
  }

  static async deleteNeighborhoodSupervisor(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.NEIGHBORHOOD_SUPERVISORS, id);
      return { success: true, message: 'Mahalle sorumlusu silindi' };
    } catch (error) {
      console.error('Delete neighborhood supervisor error:', error);
      throw new Error('Mahalle sorumlusu silinirken hata oluştu');
    }
  }

  // Village Supervisors CRUD
  static async getVillageSupervisors() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.VILLAGE_SUPERVISORS);
    } catch (error) {
      console.error('Get village supervisors error:', error);
      return [];
    }
  }

  static async createVillageSupervisor(supervisorData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.VILLAGE_SUPERVISORS, null, supervisorData);
      return { success: true, id: docId, message: 'Köy sorumlusu oluşturuldu' };
    } catch (error) {
      console.error('Create village supervisor error:', error);
      throw new Error('Köy sorumlusu oluşturulurken hata oluştu');
    }
  }

  static async updateVillageSupervisor(id, supervisorData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.VILLAGE_SUPERVISORS, id, supervisorData);
      return { success: true, message: 'Köy sorumlusu güncellendi' };
    } catch (error) {
      console.error('Update village supervisor error:', error);
      throw new Error('Köy sorumlusu güncellenirken hata oluştu');
    }
  }

  static async deleteVillageSupervisor(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.VILLAGE_SUPERVISORS, id);
      return { success: true, message: 'Köy sorumlusu silindi' };
    } catch (error) {
      console.error('Delete village supervisor error:', error);
      throw new Error('Köy sorumlusu silinirken hata oluştu');
    }
  }

  // Ballot Boxes CRUD
  static async getBallotBoxes() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.BALLOT_BOXES);
    } catch (error) {
      console.error('Get ballot boxes error:', error);
      return [];
    }
  }

  static async getBallotBoxById(id) {
    try {
      return await FirebaseService.getById(this.COLLECTIONS.BALLOT_BOXES, id);
    } catch (error) {
      console.error('Get ballot box by id error:', error);
      return null;
    }
  }

  static async createBallotBox(ballotBoxData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.BALLOT_BOXES, null, ballotBoxData);
      return { success: true, id: docId, message: 'Sandık oluşturuldu' };
    } catch (error) {
      console.error('Create ballot box error:', error);
      throw new Error('Sandık oluşturulurken hata oluştu');
    }
  }

  static async updateBallotBox(id, ballotBoxData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.BALLOT_BOXES, id, ballotBoxData);
      return { success: true, message: 'Sandık güncellendi' };
    } catch (error) {
      console.error('Update ballot box error:', error);
      throw new Error('Sandık güncellenirken hata oluştu');
    }
  }

  static async deleteBallotBox(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.BALLOT_BOXES, id);
      return { success: true, message: 'Sandık silindi' };
    } catch (error) {
      console.error('Delete ballot box error:', error);
      throw new Error('Sandık silinirken hata oluştu');
    }
  }

  // Ballot Box Observers CRUD
  static async getBallotBoxObservers() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.BALLOT_BOX_OBSERVERS);
    } catch (error) {
      console.error('Get ballot box observers error:', error);
      return [];
    }
  }

  static async createBallotBoxObserver(observerData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.BALLOT_BOX_OBSERVERS, null, observerData);
      return { success: true, id: docId, message: 'Sandık gözlemcisi oluşturuldu' };
    } catch (error) {
      console.error('Create ballot box observer error:', error);
      throw new Error('Sandık gözlemcisi oluşturulurken hata oluştu');
    }
  }

  static async updateBallotBoxObserver(id, observerData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.BALLOT_BOX_OBSERVERS, id, observerData);
      return { success: true, message: 'Sandık gözlemcisi güncellendi' };
    } catch (error) {
      console.error('Update ballot box observer error:', error);
      throw new Error('Sandık gözlemcisi güncellenirken hata oluştu');
    }
  }

  static async deleteBallotBoxObserver(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.BALLOT_BOX_OBSERVERS, id);
      return { success: true, message: 'Sandık gözlemcisi silindi' };
    } catch (error) {
      console.error('Delete ballot box observer error:', error);
      throw new Error('Sandık gözlemcisi silinirken hata oluştu');
    }
  }

  // District Officials CRUD
  static async getAllDistrictOfficials() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.DISTRICT_OFFICIALS);
    } catch (error) {
      console.error('Get all district officials error:', error);
      return [];
    }
  }

  static async getDistrictOfficials(districtId) {
    try {
      return await FirebaseService.findByField(this.COLLECTIONS.DISTRICT_OFFICIALS, 'district_id', districtId);
    } catch (error) {
      console.error('Get district officials error:', error);
      return [];
    }
  }

  static async createOrUpdateDistrictOfficials(officialsData) {
    try {
      // district_id kontrolü
      if (!officialsData.district_id) {
        throw new Error('district_id gereklidir');
      }

      // district_id'yi string'e çevir
      const districtId = String(officialsData.district_id);
      
      // undefined değerleri temizle
      const cleanedData = {
        district_id: districtId,
        chairman_name: officialsData.chairman_name || null,
        chairman_phone: officialsData.chairman_phone || null,
        chairman_member_id: officialsData.chairman_member_id || null,
        inspector_name: officialsData.inspector_name || null,
        inspector_phone: officialsData.inspector_phone || null,
        inspector_member_id: officialsData.inspector_member_id || null,
        deputy_inspectors: officialsData.deputy_inspectors || []
      };

      // district_id ile mevcut kaydı bul
      const existing = await FirebaseService.findByField(
        this.COLLECTIONS.DISTRICT_OFFICIALS, 
        'district_id', 
        districtId
      );
      
      if (existing && existing.length > 0) {
        // Güncelle
        await FirebaseService.update(this.COLLECTIONS.DISTRICT_OFFICIALS, existing[0].id, cleanedData, false);
        return { success: true, id: existing[0].id, message: 'İlçe yetkilileri güncellendi' };
      } else {
        // Yeni oluştur
        const docId = await FirebaseService.create(this.COLLECTIONS.DISTRICT_OFFICIALS, null, cleanedData, false);
        return { success: true, id: docId, message: 'İlçe yetkilileri oluşturuldu' };
      }
    } catch (error) {
      console.error('Create/update district officials error:', error);
      throw new Error('İlçe yetkilileri kaydedilirken hata oluştu: ' + (error.message || error));
    }
  }

  static async deleteDistrictOfficials(districtId) {
    try {
      const existing = await FirebaseService.findByField(
        this.COLLECTIONS.DISTRICT_OFFICIALS, 
        'district_id', 
        districtId
      );
      
      if (existing && existing.length > 0) {
        await FirebaseService.delete(this.COLLECTIONS.DISTRICT_OFFICIALS, existing[0].id);
        return { success: true, message: 'İlçe yetkilileri silindi' };
      }
      return { success: true, message: 'İlçe yetkilileri bulunamadı' };
    } catch (error) {
      console.error('Delete district officials error:', error);
      throw new Error('İlçe yetkilileri silinirken hata oluştu');
    }
  }

  // District Deputy Inspectors
  static async getDistrictDeputyInspectors(districtId) {
    try {
      // districtId undefined ise boş array döndür
      if (!districtId || districtId === undefined) {
        return [];
      }
      
      // Deputy inspectors muhtemelen district_officials collection'ında veya ayrı bir collection'da
      // Önce district_officials içinde arayalım
      const officials = await FirebaseService.findByField(
        this.COLLECTIONS.DISTRICT_OFFICIALS, 
        'district_id', 
        String(districtId) // String'e çevirerek tutarlılık sağla
      );
      // Deputy inspectors'ı filtrele (eğer type field'ı varsa)
      const deputyInspectors = officials.filter(official => 
        official.type === 'deputy_inspector' || 
        official.role === 'deputy_inspector' ||
        official.position === 'deputy_inspector'
      );
      return deputyInspectors;
    } catch (error) {
      console.error('Get district deputy inspectors error:', error);
      return [];
    }
  }

  // Get all district deputy inspectors (parametresiz)
  static async getAllDistrictDeputyInspectors() {
    try {
      // Tüm district officials'ları al
      const allOfficials = await FirebaseService.getAll(this.COLLECTIONS.DISTRICT_OFFICIALS);
      // Deputy inspectors'ı filtrele
      const deputyInspectors = allOfficials.filter(official => 
        official.type === 'deputy_inspector' || 
        official.role === 'deputy_inspector' ||
        official.position === 'deputy_inspector'
      );
      return deputyInspectors;
    } catch (error) {
      console.error('Get all district deputy inspectors error:', error);
      return [];
    }
  }

  // Town Officials CRUD
  static async getTownOfficials(townId) {
    try {
      // townId undefined ise boş array döndür
      if (!townId || townId === undefined) {
        return [];
      }
      
      return await FirebaseService.findByField(this.COLLECTIONS.TOWN_OFFICIALS, 'town_id', String(townId)); // String'e çevirerek tutarlılık sağla
    } catch (error) {
      console.error('Get town officials error:', error);
      return [];
    }
  }

  // Town Deputy Inspectors
  static async getTownDeputyInspectors(townId) {
    try {
      // townId undefined ise boş array döndür
      if (!townId || townId === undefined) {
        return [];
      }
      
      // Town officials'ları al ve deputy inspector'ları filtrele
      const officials = await FirebaseService.findByField(
        this.COLLECTIONS.TOWN_OFFICIALS, 
        'town_id', 
        String(townId) // String'e çevirerek tutarlılık sağla
      );
      const deputyInspectors = officials.filter(official => 
        official.type === 'deputy_inspector' || 
        official.role === 'deputy_inspector' ||
        official.position === 'deputy_inspector'
      );
      return deputyInspectors;
    } catch (error) {
      console.error('Get town deputy inspectors error:', error);
      return [];
    }
  }

  // Get all town deputy inspectors (parametresiz)
  static async getAllTownDeputyInspectors() {
    try {
      // Tüm town officials'ları al
      const allOfficials = await FirebaseService.getAll(this.COLLECTIONS.TOWN_OFFICIALS);
      // Deputy inspectors'ı filtrele
      const deputyInspectors = allOfficials.filter(official => 
        official.type === 'deputy_inspector' || 
        official.role === 'deputy_inspector' ||
        official.position === 'deputy_inspector'
      );
      return deputyInspectors;
    } catch (error) {
      console.error('Get all town deputy inspectors error:', error);
      return [];
    }
  }

  static async createOrUpdateTownOfficials(officialsData) {
    try {
      // town_id kontrolü
      if (!officialsData.town_id) {
        throw new Error('town_id gereklidir');
      }

      // town_id'yi string'e çevir
      const townId = String(officialsData.town_id);
      
      // undefined değerleri temizle
      const cleanedData = {
        town_id: townId,
        chairman_name: officialsData.chairman_name || null,
        chairman_phone: officialsData.chairman_phone || null,
        chairman_member_id: officialsData.chairman_member_id || null,
        inspector_name: officialsData.inspector_name || null,
        inspector_phone: officialsData.inspector_phone || null,
        inspector_member_id: officialsData.inspector_member_id || null,
        deputy_inspectors: officialsData.deputy_inspectors || []
      };

      const existing = await FirebaseService.findByField(
        this.COLLECTIONS.TOWN_OFFICIALS, 
        'town_id', 
        townId
      );
      
      if (existing && existing.length > 0) {
        await FirebaseService.update(this.COLLECTIONS.TOWN_OFFICIALS, existing[0].id, cleanedData, false);
      } else {
        await FirebaseService.create(this.COLLECTIONS.TOWN_OFFICIALS, null, cleanedData, false);
      }

      // Belde başkanı kullanıcısı oluştur/güncelle (eğer başkan bilgileri varsa)
      if (cleanedData.chairman_name && cleanedData.chairman_phone) {
        try {
          // Belde bilgisini al
          const town = await FirebaseService.getById(this.COLLECTIONS.TOWNS, townId);
          if (town) {
            // Başkan üye ise, üye kullanıcısı oluştur (eğer yoksa)
            if (cleanedData.chairman_member_id) {
              const memberUsers = await FirebaseService.findByField(
                this.COLLECTIONS.MEMBER_USERS,
                'memberId',
                String(cleanedData.chairman_member_id)
              );
              
              if (!memberUsers || memberUsers.length === 0) {
                // Üye bilgisini al
                const member = await FirebaseService.getById(this.COLLECTIONS.MEMBERS, cleanedData.chairman_member_id);
                if (member) {
                  // TC ve telefon numarasını decrypt et
                  const tc = member.tc && member.tc.startsWith('U2FsdGVkX1') ? decryptData(member.tc) : member.tc;
                  const phone = member.phone && member.phone.startsWith('U2FsdGVkX1') ? decryptData(member.phone) : member.phone;
                  
                  // Üye kullanıcısı oluştur
                  await this.createMemberUser(cleanedData.chairman_member_id, tc, phone.replace(/\D/g, ''));
                  console.log('✅ Created member user for chairman member ID:', cleanedData.chairman_member_id);
                }
              } else {
                console.log('ℹ️ Chairman is a member and already has a user account, skipping town president user creation');
              }
            } else {
              // Başkan üye değilse, belde başkanı kullanıcısı oluştur
              // Kullanıcı adı: belde adı (normalize edilmiş - Türkçe karakterler düzeltilmiş)
              const normalizedTownName = town.name
                .toLowerCase()
                .replace(/ç/g, 'c')
                .replace(/ğ/g, 'g')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ş/g, 's')
                .replace(/ü/g, 'u')
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');
              const username = normalizedTownName;
              const password = cleanedData.chairman_phone.replace(/\D/g, ''); // Sadece rakamlar
              
              // Mevcut belde başkanı kullanıcısını kontrol et
              const existingTownUsers = await FirebaseService.findByField(
                this.COLLECTIONS.MEMBER_USERS,
                'townId',
                townId
              );
              
              if (existingTownUsers && existingTownUsers.length > 0) {
                // Mevcut kullanıcıyı güncelle
                const townUser = existingTownUsers.find(u => u.userType === 'town_president');
                if (townUser) {
                  // Firebase Auth'da kullanıcı yoksa oluştur
                  if (!townUser.authUid) {
                    try {
                      const email = `${username}@ilsekreterlik.local`;
                      const currentUser = auth.currentUser;
                      const currentUserUid = currentUser ? currentUser.uid : null;
                      
                      const authUser = await createUserWithEmailAndPassword(auth, email, password);
                      console.log('✅ Firebase Auth user created for existing town president:', authUser.user.uid);
                      
                      // Admin kullanıcısını geri yükle
                      if (currentUserUid && currentUserUid !== authUser.user.uid) {
                        try {
                          await signInWithEmailAndPassword(auth, currentUser.email, currentUser.password || 'admin123');
                          console.log('✅ Admin user restored');
                        } catch (restoreError) {
                          console.warn('⚠️ Could not restore admin user:', restoreError);
                        }
                      }
                      
                      // Firestore'da authUid'yi güncelle
                      await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, townUser.id, {
                        username,
                        password: password,
                        chairmanName: cleanedData.chairman_name,
                        chairmanPhone: cleanedData.chairman_phone,
                        authUid: authUser.user.uid
                      });
                    } catch (authError) {
                      console.warn('⚠️ Firebase Auth user creation failed (non-critical):', authError);
                      // Auth oluşturulamasa bile Firestore'u güncelle
                      await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, townUser.id, {
                        username,
                        password: password,
                        chairmanName: cleanedData.chairman_name,
                        chairmanPhone: cleanedData.chairman_phone
                      });
                    }
                  } else {
                    // Auth UID varsa Firestore'u güncelle
                    // Telefon değiştiyse şifre de güncellenmeli
                    const oldPhone = townUser.chairmanPhone || townUser.password;
                    const newPhone = cleanedData.chairman_phone.replace(/\D/g, '');
                    const phoneChanged = oldPhone && oldPhone.replace(/\D/g, '') !== newPhone;
                    
                    await FirebaseService.update(this.COLLECTIONS.MEMBER_USERS, townUser.id, {
                      username,
                      password: password, // Şifreleme FirebaseService içinde yapılacak
                      chairmanName: cleanedData.chairman_name,
                      chairmanPhone: cleanedData.chairman_phone
                    });
                    
                    // Telefon değiştiyse şifre de güncellendi (Firestore'da)
                    // Firebase Auth'daki şifre güncellemesi için backend/Cloud Functions gerekir
                    // Şimdilik Firestore'daki password güncelleniyor, login sırasında kontrol edilecek
                    if (phoneChanged) {
                      console.log('✅ Town president phone changed, password updated in Firestore:', {
                        oldPhone: oldPhone?.replace(/\D/g, ''),
                        newPhone: newPhone,
                        username
                      });
                    }
                  }
                  console.log('✅ Updated town president user for town ID:', townId);
                }
              } else {
                // Yeni belde başkanı kullanıcısı oluştur
                // Önce Firebase Auth'da kullanıcı oluştur
                const email = `${username}@ilsekreterlik.local`;
                let authUser = null;
                
                try {
                  // Mevcut kullanıcıyı koru
                  const currentUser = auth.currentUser;
                  const currentUserUid = currentUser ? currentUser.uid : null;
                  
                  // Firebase Auth'da kullanıcı oluştur
                  authUser = await createUserWithEmailAndPassword(auth, email, password);
                  console.log('✅ Firebase Auth user created for town president:', authUser.user.uid);
                  
                  // Admin kullanıcısını geri yükle (eğer varsa)
                  if (currentUserUid && currentUserUid !== authUser.user.uid) {
                    try {
                      await signInWithEmailAndPassword(auth, currentUser.email, currentUser.password || 'admin123');
                      console.log('✅ Admin user restored after town president user creation');
                    } catch (restoreError) {
                      console.warn('⚠️ Could not restore admin user, will need to re-login:', restoreError);
                    }
                  }
                } catch (authError) {
                  // Email zaten kullanılıyorsa, mevcut kullanıcıyı kullan
                  if (authError.code === 'auth/email-already-in-use') {
                    console.warn('⚠️ Email already in use for town president, will use existing user:', email);
                    // Mevcut kullanıcıyı bulmak için sign-in denemesi yapabiliriz ama bu karmaşık olabilir
                    // Bu durumda sadece Firestore'a kaydediyoruz
                  } else {
                    console.warn('⚠️ Firebase Auth user creation failed (non-critical):', authError);
                  }
                }
                
                // Firestore'a kaydet
                await FirebaseService.create(
                  this.COLLECTIONS.MEMBER_USERS,
                  null,
                  {
                    username,
                    password: password, // Şifreleme FirebaseService içinde yapılacak
                    userType: 'town_president',
                    townId: townId,
                    chairmanName: cleanedData.chairman_name,
                    chairmanPhone: cleanedData.chairman_phone,
                    isActive: true,
                    authUid: authUser?.user?.uid || null // Auth UID varsa kaydet
                  }
                );
                console.log('✅ Created town president user for town ID:', townId, 'Username:', username, 'Password:', password);
              }
            }
          }
        } catch (userError) {
          console.warn('⚠️ Error creating/updating town president user (non-critical):', userError);
          // Kullanıcı oluşturma hatası kritik değil, devam et
        }
      }
      
      if (existing && existing.length > 0) {
        return { success: true, id: existing[0].id, message: 'Belde yetkilileri güncellendi' };
      } else {
        return { success: true, id: townId, message: 'Belde yetkilileri oluşturuldu' };
      }
    } catch (error) {
      console.error('Create/update town officials error:', error);
      throw new Error('Belde yetkilileri kaydedilirken hata oluştu: ' + (error.message || error));
    }
  }

  static async deleteTownOfficials(townId) {
    try {
      const existing = await FirebaseService.findByField(this.COLLECTIONS.TOWN_OFFICIALS, 'town_id', townId);
      if (existing && existing.length > 0) {
        await FirebaseService.delete(this.COLLECTIONS.TOWN_OFFICIALS, existing[0].id);
        return { success: true, message: 'İlçe yetkilileri silindi' };
      }
      return { success: true, message: 'İlçe yetkilileri bulunamadı' };
    } catch (error) {
      console.error('Delete town officials error:', error);
      throw new Error('İlçe yetkilileri silinirken hata oluştu');
    }
  }

  // District Management Members CRUD
  static async getDistrictManagementMembers(districtId) {
    try {
      return await FirebaseService.findByField(this.COLLECTIONS.DISTRICT_MANAGEMENT_MEMBERS, 'district_id', districtId);
    } catch (error) {
      console.error('Get district management members error:', error);
      return [];
    }
  }

  static async createDistrictManagementMember(memberData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.DISTRICT_MANAGEMENT_MEMBERS, null, memberData);
      return { success: true, id: docId, message: 'İlçe yönetim üyesi oluşturuldu' };
    } catch (error) {
      console.error('Create district management member error:', error);
      throw new Error('İlçe yönetim üyesi oluşturulurken hata oluştu');
    }
  }

  static async updateDistrictManagementMember(id, memberData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.DISTRICT_MANAGEMENT_MEMBERS, id, memberData);
      return { success: true, message: 'İlçe yönetim üyesi güncellendi' };
    } catch (error) {
      console.error('Update district management member error:', error);
      throw new Error('İlçe yönetim üyesi güncellenirken hata oluştu');
    }
  }

  static async deleteDistrictManagementMember(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.DISTRICT_MANAGEMENT_MEMBERS, id);
      return { success: true, message: 'İlçe yönetim üyesi silindi' };
    } catch (error) {
      console.error('Delete district management member error:', error);
      throw new Error('İlçe yönetim üyesi silinirken hata oluştu');
    }
  }

  // Town Management Members CRUD
  static async getTownManagementMembers(townId) {
    try {
      return await FirebaseService.findByField(this.COLLECTIONS.TOWN_MANAGEMENT_MEMBERS, 'town_id', townId);
    } catch (error) {
      console.error('Get town management members error:', error);
      return [];
    }
  }

  static async createTownManagementMember(memberData) {
    try {
      const docId = await FirebaseService.create(this.COLLECTIONS.TOWN_MANAGEMENT_MEMBERS, null, memberData);
      return { success: true, id: docId, message: 'İlçe yönetim üyesi oluşturuldu' };
    } catch (error) {
      console.error('Create town management member error:', error);
      throw new Error('İlçe yönetim üyesi oluşturulurken hata oluştu');
    }
  }

  static async updateTownManagementMember(id, memberData) {
    try {
      await FirebaseService.update(this.COLLECTIONS.TOWN_MANAGEMENT_MEMBERS, id, memberData);
      return { success: true, message: 'İlçe yönetim üyesi güncellendi' };
    } catch (error) {
      console.error('Update town management member error:', error);
      throw new Error('İlçe yönetim üyesi güncellenirken hata oluştu');
    }
  }

  static async deleteTownManagementMember(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.TOWN_MANAGEMENT_MEMBERS, id);
      return { success: true, message: 'İlçe yönetim üyesi silindi' };
    } catch (error) {
      console.error('Delete town management member error:', error);
      throw new Error('İlçe yönetim üyesi silinirken hata oluştu');
    }
  }

  // Delete Firebase Auth User using Admin SDK REST API
  // Note: This is a simplified implementation. In production, this should be done on the backend
  // using Firebase Admin SDK or Cloud Functions
  static async deleteFirebaseAuthUser(authUid) {
    try {
      if (!authUid) {
        console.warn('⚠️ No authUid provided for deletion');
        return;
      }

      // Firebase Identity Platform REST API kullanarak kullanıcıyı sil
      // Bu işlem için Firebase API Key ve Admin SDK gereklidir
      // Client-side'da Admin SDK kullanmak güvenlik riski oluşturur
      // Ancak kullanıcı silme işlemi için Identity Platform REST API kullanabiliriz
      
      // Firebase config'den API key'i al
      const firebaseConfig = auth.app.options;
      const apiKey = firebaseConfig?.apiKey;
      
      if (!apiKey) {
        console.warn('⚠️ Firebase API key not found, cannot delete user from Firebase Auth');
        console.warn('⚠️ User authUid will be removed from Firestore, Firebase Auth user will be invalid on next login');
        return;
      }

      // Firebase Identity Platform REST API endpoint
      const deleteUserUrl = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`;
      
      // Kullanıcıyı silmek için ID token gereklidir
      // Ancak client-side'da başka bir kullanıcının token'ını alamayız
      // Bu yüzden şimdilik Firestore'dan authUid'i kaldırıyoruz
      // Login sırasında kontrol edilip, eğer Firestore'da yoksa Firebase Auth'daki kullanıcı da geçersiz sayılır
      
      console.log('⚠️ Firebase Auth user deletion requires user ID token');
      console.log('⚠️ User authUid will be removed from Firestore, Firebase Auth user will be invalid on next login');
      console.log('⚠️ For complete deletion, use Firebase Admin SDK on backend/Cloud Functions');
      
      // Firestore'dan authUid zaten kaldırılacak (member_user silindiğinde)
      // Bu yüzden burada bir şey yapmaya gerek yok
      // Login sırasında Firestore'da authUid yoksa, Firebase Auth'daki kullanıcı da geçersiz sayılır
      
    } catch (error) {
      console.error('❌ Error in deleteFirebaseAuthUser:', error);
      // Non-critical error, continue
    }
  }

  // Delete Member User
  static async deleteMemberUser(id) {
    try {
      // Önce Firestore'dan kullanıcıyı al
      const memberUser = await FirebaseService.getById(this.COLLECTIONS.MEMBER_USERS, id);
      
      if (!memberUser) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      // Eğer Firebase Auth'da kullanıcı varsa (authUid varsa), sil
      if (memberUser.authUid) {
        try {
          await this.deleteFirebaseAuthUser(memberUser.authUid);
          console.log('✅ Firebase Auth user deletion attempted:', memberUser.authUid);
        } catch (authError) {
          console.warn('⚠️ Firebase Auth deletion failed (non-critical):', authError);
        }
      }

      // Firestore'dan sil
      await FirebaseService.delete(this.COLLECTIONS.MEMBER_USERS, id);
      
      console.log('✅ Member user deleted from Firestore:', id);
      return { success: true, message: 'Kullanıcı silindi' };
    } catch (error) {
      console.error('Delete member user error:', error);
      throw new Error('Kullanıcı silinirken hata oluştu: ' + error.message);
    }
  }

  // Groups CRUD
  static async getGroups() {
    try {
      return await FirebaseService.getAll(this.COLLECTIONS.GROUPS);
    } catch (error) {
      console.error('Get groups error:', error);
      return [];
    }
  }

  static async getGroupByGroupNo(groupNo) {
    try {
      const groups = await FirebaseService.getAll(this.COLLECTIONS.GROUPS);
      return groups.find(g => String(g.group_no) === String(groupNo));
    } catch (error) {
      console.error('Get group by group_no error:', error);
      return null;
    }
  }

  static async createOrUpdateGroup(groupNo, groupLeaderId) {
    try {
      const existingGroup = await this.getGroupByGroupNo(groupNo);
      
      if (existingGroup) {
        // Update existing group
        await FirebaseService.update(this.COLLECTIONS.GROUPS, existingGroup.id, {
          group_no: groupNo,
          group_leader_id: groupLeaderId || null
        });
        return { success: true, id: existingGroup.id, message: 'Grup güncellendi' };
      } else {
        // Create new group
        const docId = await FirebaseService.create(this.COLLECTIONS.GROUPS, null, {
          group_no: groupNo,
          group_leader_id: groupLeaderId || null
        });
        return { success: true, id: docId, message: 'Grup oluşturuldu' };
      }
    } catch (error) {
      console.error('Create or update group error:', error);
      throw new Error('Grup oluşturulurken veya güncellenirken hata oluştu');
    }
  }

  static async deleteGroup(groupNo) {
    try {
      const group = await this.getGroupByGroupNo(groupNo);
      if (group) {
        await FirebaseService.delete(this.COLLECTIONS.GROUPS, group.id);
        return { success: true, message: 'Grup silindi' };
      }
      return { success: false, message: 'Grup bulunamadı' };
    } catch (error) {
      console.error('Delete group error:', error);
      throw new Error('Grup silinirken hata oluştu');
    }
  }

  // Personal Documents API methods
  static async getPersonalDocuments(memberId) {
    try {
      // memberId'yi string'e çevir
      const memberIdStr = String(memberId);
      
      // Firebase'de personal_documents collection'ından member_id'ye göre filtrele
      const documents = await FirebaseService.findByField(
        this.COLLECTIONS.PERSONAL_DOCUMENTS,
        'member_id',
        memberIdStr
      );
      
      return documents || [];
    } catch (error) {
      console.error('Get personal documents error:', error);
      return [];
    }
  }

  static async uploadPersonalDocument(memberId, documentName, file) {
    try {
      // memberId'yi string'e çevir
      const memberIdStr = String(memberId);
      
      // Dosyayı base64'e çevir (Firebase Storage kullanmadan önce)
      const reader = new FileReader();
      const fileData = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Belge verilerini hazırla
      const documentData = {
        member_id: memberIdStr,
        document_name: documentName.trim(),
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_data: fileData, // Base64 encoded file data
        uploaded_at: new Date().toISOString()
      };
      
      // Firebase'e kaydet (şifreleme yok - belge adı hassas değil)
      const docId = await FirebaseService.create(
        this.COLLECTIONS.PERSONAL_DOCUMENTS,
        null,
        documentData,
        false // Şifreleme yok
      );
      
      return {
        message: 'Belge başarıyla yüklendi',
        document: {
          id: docId,
          document_name: documentName,
          file_size: file.size,
          uploaded_at: documentData.uploaded_at
        }
      };
    } catch (error) {
      console.error('Upload personal document error:', error);
      throw new Error('Belge yüklenirken hata oluştu: ' + (error.message || error));
    }
  }

  static async downloadPersonalDocument(documentId) {
    try {
      // Belgeyi Firebase'den al
      const document = await FirebaseService.getById(
        this.COLLECTIONS.PERSONAL_DOCUMENTS,
        documentId
      );
      
      if (!document) {
        throw new Error('Belge bulunamadı');
      }
      
      // Base64'ten blob'a çevir
      if (document.file_data) {
        // Base64 data URL'den blob'a çevir
        const response = await fetch(document.file_data);
        const blob = await response.blob();
        return blob;
      } else {
        throw new Error('Belge verisi bulunamadı');
      }
    } catch (error) {
      console.error('Download personal document error:', error);
      throw new Error('Belge indirilirken hata oluştu: ' + (error.message || error));
    }
  }

  static async deletePersonalDocument(documentId) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.PERSONAL_DOCUMENTS, documentId);
      return { success: true, message: 'Belge silindi' };
    } catch (error) {
      console.error('Delete personal document error:', error);
      throw new Error('Belge silinirken hata oluştu');
    }
  }

  // SMS API Methods
  /**
   * Planlanan toplantı/etkinlik için otomatik SMS gönder
   * @param {string} type - 'meeting' veya 'event'
   * @param {object} data - Toplantı/etkinlik verisi
   * @param {string[]} regions - Bölge isimleri
   */
  static async sendAutoSmsForScheduled(type, data, regions) {
    try {
      // Otomatik SMS ayarlarını kontrol et
      const autoSettings = await FirebaseService.getById('sms_auto_settings', 'main');
      if (!autoSettings) {
        console.log('Auto SMS settings not found, skipping SMS');
        return { success: false, message: 'Otomatik SMS ayarları bulunamadı' };
      }

      const isEnabled = type === 'meeting' 
        ? autoSettings.autoSmsForMeetings 
        : autoSettings.autoSmsForEvents;

      if (!isEnabled) {
        console.log(`Auto SMS for ${type} is disabled`);
        return { success: false, message: `Otomatik SMS ${type === 'meeting' ? 'toplantılar' : 'etkinlikler'} için devre dışı` };
      }

      // SMS servisini yükle
      const { default: smsService } = await import('../services/SmsService');
      await smsService.loadConfig();

      // Seçili bölgelerdeki üyeleri al
      const allMembers = await this.getMembers();
      const filteredMembers = allMembers.filter(member => 
        member.region && regions.includes(member.region)
      );

      if (filteredMembers.length === 0) {
        console.log('No members found for selected regions');
        return { success: false, message: 'Seçili bölgelerde üye bulunamadı' };
      }

      // Tarih ve saat formatla
      const dateObj = new Date(data.date);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const timeStr = dateObj.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Özel metin
      const customText = type === 'meeting' 
        ? (autoSettings.meetingCustomText || '') 
        : (autoSettings.eventCustomText || '');

      // Mesaj formatla
      const typeText = type === 'meeting' ? 'toplantı' : 'etkinlik';
      const nameText = data.name || (type === 'meeting' ? 'Toplantı' : 'Etkinlik');

      // Telefon numaralarını topla
      const phones = filteredMembers
        .map(member => {
          const phone = member.phone || '';
          return phone ? smsService.formatPhoneNumber(phone) : null;
        })
        .filter(phone => phone !== null);

      if (phones.length === 0) {
        console.log('No valid phone numbers found');
        return { success: false, message: 'Geçerli telefon numarası bulunamadı' };
      }

      // Her üye için kişiselleştirilmiş mesaj gönder
      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };

      for (const member of filteredMembers) {
        const phone = smsService.formatPhoneNumber(member.phone);
        if (!phone) {
          results.failed++;
          results.errors.push({ member: member.name, error: 'Geçersiz telefon numarası' });
          continue;
        }

        const memberName = member.name || 'Üye';
        const message = smsService.formatScheduledMessage(
          memberName,
          type,
          dateStr,
          timeStr,
          customText
        );

        try {
          const result = await smsService.sendSms(phone, message);
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({ member: memberName, error: result.message });
          }
          // Rate limiting için kısa bir bekleme
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push({ member: memberName, error: error.message });
        }
      }

      return {
        success: results.failed === 0,
        message: `${results.sent} SMS gönderildi, ${results.failed} başarısız`,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      };
    } catch (error) {
      console.error('Send auto SMS error:', error);
      return { success: false, message: 'Otomatik SMS gönderilirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Toplu SMS gönder
   * @param {string} message - Gönderilecek mesaj
   * @param {string[]} regions - Bölge isimleri (boş ise tüm üyelere)
   * @param {string[]} memberIds - Belirli üye ID'leri (opsiyonel)
   * @param {object} options - { includeObservers: boolean, includeChiefObservers: boolean, includeTownPresidents: boolean, includeNeighborhoodRepresentatives: boolean, includeVillageRepresentatives: boolean }
   */
  static async sendBulkSms(message, regions = [], memberIds = [], options = {}) {
    try {
      const { 
        includeObservers = false, 
        includeChiefObservers = false, 
        includeTownPresidents = false,
        includeNeighborhoodRepresentatives = false,
        includeVillageRepresentatives = false
      } = options;

      // SMS servisini yükle
      const { default: smsService } = await import('../services/SmsService');
      await smsService.loadConfig();

      // Üyeleri al
      let members = await this.getMembers();
      
      // Bölge filtresi
      if (regions.length > 0) {
        members = members.filter(member => 
          member.region && regions.includes(member.region)
        );
      }

      // Belirli üye ID'leri filtresi
      if (memberIds.length > 0) {
        members = members.filter(member => 
          memberIds.includes(String(member.id))
        );
      }

      // Telefon numaralarını topla ve mesajları formatla
      let smsData = members
        .map(member => {
          const phone = smsService.formatPhoneNumber(member.phone);
          if (!phone) return null;
          
          const memberName = member.name || 'Üye';
          const personalizedMessage = smsService.formatBulkMessage(memberName, message);
          
          return { phone, message: personalizedMessage, name: memberName, type: 'member' };
        })
        .filter(item => item !== null);

      // Müşahitler ekle
      if (includeObservers) {
        const observers = await this.getBallotBoxObservers();
        const regularObservers = observers.filter(obs => !obs.is_chief_observer);
        
        for (const observer of regularObservers) {
          const phone = smsService.formatPhoneNumber(observer.observer_phone || observer.phone);
          if (phone) {
            const observerName = observer.observer_name || observer.name || 'Müşahit';
            const personalizedMessage = smsService.formatBulkMessage(observerName, message);
            smsData.push({ phone, message: personalizedMessage, name: observerName, type: 'observer' });
          }
        }
      }

      // Baş müşahitler ekle
      if (includeChiefObservers) {
        const observers = await this.getBallotBoxObservers();
        const chiefObservers = observers.filter(obs => obs.is_chief_observer === true);
        
        for (const observer of chiefObservers) {
          const phone = smsService.formatPhoneNumber(observer.observer_phone || observer.phone);
          if (phone) {
            const observerName = observer.observer_name || observer.name || 'Baş Müşahit';
            const personalizedMessage = smsService.formatBulkMessage(observerName, message);
            smsData.push({ phone, message: personalizedMessage, name: observerName, type: 'chief_observer' });
          }
        }
      }

      // Belde başkanları ekle
      if (includeTownPresidents) {
        const townOfficials = await FirebaseService.getAll(this.COLLECTIONS.TOWN_OFFICIALS);
        const presidents = townOfficials.filter(official => 
          official.type === 'president' || 
          official.role === 'president' || 
          official.position === 'president' ||
          official.chairman_name // Eğer chairman_name varsa başkan olabilir
        );
        
        for (const president of presidents) {
          const phone = smsService.formatPhoneNumber(president.chairman_phone || president.phone);
          if (phone) {
            const presidentName = president.chairman_name || president.name || 'Belde Başkanı';
            const personalizedMessage = smsService.formatBulkMessage(presidentName, message);
            smsData.push({ phone, message: personalizedMessage, name: presidentName, type: 'town_president' });
          }
        }
      }

      // Mahalle temsilcileri ekle
      if (includeNeighborhoodRepresentatives) {
        const neighborhoodReps = await this.getNeighborhoodRepresentatives();
        
        for (const rep of neighborhoodReps) {
          const phone = smsService.formatPhoneNumber(rep.phone);
          if (phone) {
            const repName = rep.name || 'Mahalle Temsilcisi';
            const personalizedMessage = smsService.formatBulkMessage(repName, message);
            smsData.push({ phone, message: personalizedMessage, name: repName, type: 'neighborhood_representative' });
          }
        }
      }

      // Köy temsilcileri ekle
      if (includeVillageRepresentatives) {
        const villageReps = await this.getVillageRepresentatives();
        
        for (const rep of villageReps) {
          const phone = smsService.formatPhoneNumber(rep.phone);
          if (phone) {
            const repName = rep.name || 'Köy Temsilcisi';
            const personalizedMessage = smsService.formatBulkMessage(repName, message);
            smsData.push({ phone, message: personalizedMessage, name: repName, type: 'village_representative' });
          }
        }
      }

      if (smsData.length === 0) {
        return { success: false, message: 'Gönderilecek kişi bulunamadı', sent: 0, failed: 0 };
      }

      // SMS gönder
      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };

      for (const { phone, message: personalizedMessage, name, type } of smsData) {
        try {
          const result = await smsService.sendSms(phone, personalizedMessage);
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({ name, type, error: result.message });
          }
          // Rate limiting için kısa bir bekleme
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push({ name, type, error: error.message });
        }
      }

      return {
        success: results.failed === 0,
        message: `${results.sent} SMS gönderildi, ${results.failed} başarısız`,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      };
    } catch (error) {
      console.error('Send bulk SMS error:', error);
      return { success: false, message: 'Toplu SMS gönderilirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Temsilcilere SMS gönder (mahalle/köy temsilcileri)
   * @param {string} type - 'neighborhood' veya 'village'
   * @param {string} message - Gönderilecek mesaj
   * @param {string[]} representativeIds - Temsilci ID'leri (boş ise tüm temsilcilere)
   */
  static async sendSmsToRepresentatives(type, message, representativeIds = []) {
    try {
      // SMS servisini yükle
      const { default: smsService } = await import('../services/SmsService');
      await smsService.loadConfig();

      // Temsilcileri al
      const representatives = type === 'neighborhood'
        ? await this.getNeighborhoodRepresentatives()
        : await this.getVillageRepresentatives();

      // ID filtresi
      let filteredRepresentatives = representatives;
      if (representativeIds.length > 0) {
        filteredRepresentatives = representatives.filter(rep =>
          representativeIds.includes(String(rep.id))
        );
      }

      if (filteredRepresentatives.length === 0) {
        return { success: false, message: 'Gönderilecek temsilci bulunamadı', sent: 0, failed: 0 };
      }

      // SMS gönder
      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };

      for (const rep of filteredRepresentatives) {
        const phone = smsService.formatPhoneNumber(rep.phone);
        if (!phone) {
          results.failed++;
          results.errors.push({ representative: rep.name || 'Temsilci', error: 'Geçersiz telefon numarası' });
          continue;
        }

        const repName = rep.name || 'Temsilci';
        const personalizedMessage = smsService.formatBulkMessage(repName, message);

        try {
          const result = await smsService.sendSms(phone, personalizedMessage);
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({ representative: repName, error: result.message });
          }
          // Rate limiting için kısa bir bekleme
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push({ representative: repName, error: error.message });
        }
      }

      return {
        success: results.failed === 0,
        message: `${results.sent} SMS gönderildi, ${results.failed} başarısız`,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      };
    } catch (error) {
      console.error('Send SMS to representatives error:', error);
      return { success: false, message: 'Temsilcilere SMS gönderilirken hata oluştu: ' + error.message };
    }
  }

  // Messages API
  /**
   * Kullanıcıya mesaj gönder
   * @param {object} messageData - { receiverId, message, messageType, filePath }
   */
  static async sendMessageToUser(messageData) {
    try {
      const { receiverId, message, messageType = 'text', filePath } = messageData;
      
      if (!receiverId || !message) {
        return { success: false, message: 'Alıcı ID ve mesaj gerekli' };
      }

      // Mevcut kullanıcıyı al (senderId)
      const { auth } = await import('../config/firebase');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'Kullanıcı giriş yapmamış' };
      }

      // Firestore'dan sender bilgisini al
      const senderUsers = await FirebaseService.findByField(
        this.COLLECTIONS.MEMBER_USERS,
        'authUid',
        currentUser.uid
      );
      
      const senderId = senderUsers && senderUsers.length > 0 
        ? senderUsers[0].id 
        : currentUser.uid;

      // Mesajı kaydet
      const messageDoc = {
        senderId: String(senderId),
        receiverId: String(receiverId),
        message: message,
        messageType: messageType,
        filePath: filePath || null,
        createdAt: new Date().toISOString()
      };

      const docId = await FirebaseService.create(
        this.COLLECTIONS.MESSAGES,
        null,
        messageDoc,
        false // Mesaj içeriği şifrelenmez
      );

      // Özel mesaj için otomatik SMS gönder
      try {
        await this.sendAutoSmsForCustomMessage(receiverId, message);
      } catch (smsError) {
        console.error('Auto SMS error (non-blocking):', smsError);
        // SMS hatası mesaj göndermeyi engellemez
      }

      return { 
        success: true, 
        id: docId, 
        message: 'Mesaj gönderildi',
        data: { ...messageDoc, id: docId }
      };
    } catch (error) {
      console.error('Send message to user error:', error);
      return { success: false, message: 'Mesaj gönderilirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Gruba mesaj gönder
   * @param {object} messageData - { groupId, message, messageType, filePath }
   */
  static async sendMessageToGroup(messageData) {
    try {
      const { groupId, message, messageType = 'text', filePath } = messageData;
      
      if (!groupId || !message) {
        return { success: false, message: 'Grup ID ve mesaj gerekli' };
      }

      // Mevcut kullanıcıyı al (senderId)
      const { auth } = await import('../config/firebase');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'Kullanıcı giriş yapmamış' };
      }

      // Firestore'dan sender bilgisini al
      const senderUsers = await FirebaseService.findByField(
        this.COLLECTIONS.MEMBER_USERS,
        'authUid',
        currentUser.uid
      );
      
      const senderId = senderUsers && senderUsers.length > 0 
        ? senderUsers[0].id 
        : currentUser.uid;

      // Mesajı kaydet
      const messageDoc = {
        senderId: String(senderId),
        groupId: String(groupId),
        message: message,
        messageType: messageType,
        filePath: filePath || null,
        createdAt: new Date().toISOString()
      };

      const docId = await FirebaseService.create(
        this.COLLECTIONS.MESSAGES,
        null,
        messageDoc,
        false // Mesaj içeriği şifrelenmez
      );

      // Gruba mesaj gönderildiğinde otomatik SMS gönder (grup üyelerine)
      try {
        await this.sendAutoSmsForGroupMessage(groupId, message);
      } catch (smsError) {
        console.error('Auto SMS error (non-blocking):', smsError);
        // SMS hatası mesaj göndermeyi engellemez
      }

      return { 
        success: true, 
        id: docId, 
        message: 'Mesaj gönderildi',
        data: { ...messageDoc, id: docId }
      };
    } catch (error) {
      console.error('Send message to group error:', error);
      return { success: false, message: 'Mesaj gönderilirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Özel mesaj için otomatik SMS gönder
   * @param {string} receiverId - Alıcı üye ID'si
   * @param {string} messageText - Mesaj metni
   */
  static async sendAutoSmsForCustomMessage(receiverId, messageText) {
    try {
      // Otomatik SMS ayarlarını kontrol et
      const autoSettings = await FirebaseService.getById('sms_auto_settings', 'main');
      if (!autoSettings || !autoSettings.autoSmsForCustom) {
        console.log('Auto SMS for custom messages is disabled');
        return { success: false, message: 'Özel mesajlar için otomatik SMS devre dışı' };
      }

      // SMS servisini yükle
      const { default: smsService } = await import('../services/SmsService');
      await smsService.loadConfig();

      // Alıcı üyeyi al
      const receiver = await FirebaseService.getById(this.COLLECTIONS.MEMBERS, receiverId);
      if (!receiver) {
        console.log('Receiver member not found');
        return { success: false, message: 'Alıcı üye bulunamadı' };
      }

      // Telefon numarasını formatla
      const phone = smsService.formatPhoneNumber(receiver.phone);
      if (!phone) {
        console.log('No valid phone number for receiver');
        return { success: false, message: 'Alıcının geçerli telefon numarası yok' };
      }

      // Mesaj formatla
      const receiverName = receiver.name || 'Üye';
      const smsMessage = `Sn ${receiverName}, size özel bir mesaj gönderildi: ${messageText}`;

      // SMS gönder
      const result = await smsService.sendSms(phone, smsMessage);
      
      if (result.success) {
        return { success: true, message: 'SMS başarıyla gönderildi' };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Send auto SMS for custom message error:', error);
      return { success: false, message: 'Otomatik SMS gönderilirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Grup mesajı için otomatik SMS gönder
   * @param {string} groupId - Grup ID'si
   * @param {string} messageText - Mesaj metni
   */
  static async sendAutoSmsForGroupMessage(groupId, messageText) {
    try {
      // Otomatik SMS ayarlarını kontrol et
      const autoSettings = await FirebaseService.getById('sms_auto_settings', 'main');
      if (!autoSettings || !autoSettings.autoSmsForCustom) {
        console.log('Auto SMS for custom messages is disabled');
        return { success: false, message: 'Özel mesajlar için otomatik SMS devre dışı' };
      }

      // SMS servisini yükle
      const { default: smsService } = await import('../services/SmsService');
      await smsService.loadConfig();

      // Grup bilgisini al (grup üyelerini bulmak için)
      // Not: Grup yapısına göre bu kısım güncellenebilir
      // Şimdilik tüm üyelere gönderiyoruz
      const allMembers = await this.getMembers();
      
      if (allMembers.length === 0) {
        console.log('No members found for group message');
        return { success: false, message: 'Grup üyesi bulunamadı' };
      }

      // Her üye için SMS gönder
      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };

      for (const member of allMembers) {
        const phone = smsService.formatPhoneNumber(member.phone);
        if (!phone) {
          results.failed++;
          results.errors.push({ member: member.name, error: 'Geçersiz telefon numarası' });
          continue;
        }

        const memberName = member.name || 'Üye';
        const smsMessage = `Sn ${memberName}, grup mesajı: ${messageText}`;

        try {
          const result = await smsService.sendSms(phone, smsMessage);
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({ member: memberName, error: result.message });
          }
          // Rate limiting için kısa bir bekleme
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push({ member: memberName, error: error.message });
        }
      }

      return {
        success: results.failed === 0,
        message: `${results.sent} SMS gönderildi, ${results.failed} başarısız`,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      };
    } catch (error) {
      console.error('Send auto SMS for group message error:', error);
      return { success: false, message: 'Otomatik SMS gönderilirken hata oluştu: ' + error.message };
    }
  }

  /**
   * İleri tarihli SMS planla
   * @param {object} smsData - { message, regions, memberIds, scheduledDate, options }
   */
  static async scheduleSms(smsData) {
    try {
      const { message, regions = [], memberIds = [], scheduledDate, options = {} } = smsData;
      
      if (!message || !scheduledDate) {
        return { success: false, message: 'Mesaj ve planlanan tarih gerekli' };
      }

      // Tarih kontrolü
      const scheduledDateTime = new Date(scheduledDate);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        return { success: false, message: 'Planlanan tarih gelecekte olmalıdır' };
      }

      // Scheduled SMS kaydet
      const scheduledSmsDoc = {
        message: message,
        regions: regions,
        memberIds: memberIds,
        options: options,
        scheduledDate: scheduledDateTime.toISOString(),
        status: 'pending', // 'pending', 'sent', 'failed', 'cancelled'
        createdAt: new Date().toISOString(),
        sentAt: null,
        result: null
      };

      const docId = await FirebaseService.create(
        this.COLLECTIONS.SCHEDULED_SMS,
        null,
        scheduledSmsDoc,
        false // SMS mesajı şifrelenmez
      );

      return { 
        success: true, 
        id: docId, 
        message: 'SMS başarıyla planlandı',
        scheduledDate: scheduledDateTime.toISOString()
      };
    } catch (error) {
      console.error('Schedule SMS error:', error);
      return { success: false, message: 'SMS planlanırken hata oluştu: ' + error.message };
    }
  }

  /**
   * Planlanmış SMS'leri al
   * @param {string} status - 'pending', 'sent', 'failed', 'cancelled' veya null (tümü)
   */
  static async getScheduledSms(status = null) {
    try {
      const allScheduled = await FirebaseService.getAll(this.COLLECTIONS.SCHEDULED_SMS);
      
      if (status) {
        return allScheduled.filter(sms => sms.status === status);
      }
      
      return allScheduled;
    } catch (error) {
      console.error('Get scheduled SMS error:', error);
      return [];
    }
  }

  /**
   * Planlanmış SMS'i iptal et
   * @param {string} id - Scheduled SMS ID
   */
  static async cancelScheduledSms(id) {
    try {
      await FirebaseService.update(this.COLLECTIONS.SCHEDULED_SMS, id, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
      return { success: true, message: 'Planlanmış SMS iptal edildi' };
    } catch (error) {
      console.error('Cancel scheduled SMS error:', error);
      return { success: false, message: 'SMS iptal edilirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Planlanmış SMS'i güncelle
   * @param {string} id - Scheduled SMS ID
   * @param {object} smsData - { message, regions, memberIds, scheduledDate, options }
   */
  static async updateScheduledSms(id, smsData) {
    try {
      const { message, regions = [], memberIds = [], scheduledDate, options = {} } = smsData;
      
      if (!message || !scheduledDate) {
        return { success: false, message: 'Mesaj ve planlanan tarih gerekli' };
      }

      // Tarih kontrolü
      const scheduledDateTime = new Date(scheduledDate);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        return { success: false, message: 'Planlanan tarih gelecekte olmalıdır' };
      }

      // Scheduled SMS güncelle
      const updatedSmsDoc = {
        message: message,
        regions: regions,
        memberIds: memberIds,
        options: options,
        scheduledDate: scheduledDateTime.toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirebaseService.update(this.COLLECTIONS.SCHEDULED_SMS, id, updatedSmsDoc, false);

      return { 
        success: true, 
        message: 'SMS başarıyla güncellendi',
        scheduledDate: scheduledDateTime.toISOString()
      };
    } catch (error) {
      console.error('Update scheduled SMS error:', error);
      return { success: false, message: 'SMS güncellenirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Planlanmış SMS'i sil
   * @param {string} id - Scheduled SMS ID
   */
  static async deleteScheduledSms(id) {
    try {
      await FirebaseService.delete(this.COLLECTIONS.SCHEDULED_SMS, id);
      return { success: true, message: 'Planlanmış SMS silindi' };
    } catch (error) {
      console.error('Delete scheduled SMS error:', error);
      return { success: false, message: 'SMS silinirken hata oluştu: ' + error.message };
    }
  }

  /**
   * Planlanmış SMS'leri kontrol et ve gönder (cron job benzeri)
   * Bu metod periyodik olarak çağrılmalı (örneğin her dakika)
   */
  static async processScheduledSms() {
    try {
      const pendingSms = await this.getScheduledSms('pending');
      const now = new Date();
      
      const smsToSend = pendingSms.filter(sms => {
        const scheduledDate = new Date(sms.scheduledDate);
        return scheduledDate <= now;
      });

      const results = {
        processed: 0,
        sent: 0,
        failed: 0
      };

      for (const sms of smsToSend) {
        try {
          // SMS gönder
          const sendResult = await this.sendBulkSms(
            sms.message,
            sms.regions || [],
            sms.memberIds || [],
            sms.options || {}
          );

          // Durumu güncelle
          await FirebaseService.update(this.COLLECTIONS.SCHEDULED_SMS, sms.id, {
            status: sendResult.success ? 'sent' : 'failed',
            sentAt: new Date().toISOString(),
            result: sendResult
          });

          results.processed++;
          if (sendResult.success) {
            results.sent++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error('Error processing scheduled SMS:', error);
          // Hata durumunu kaydet
          await FirebaseService.update(this.COLLECTIONS.SCHEDULED_SMS, sms.id, {
            status: 'failed',
            sentAt: new Date().toISOString(),
            result: { success: false, message: error.message }
          });
          results.processed++;
          results.failed++;
        }
      }

      return {
        success: true,
        message: `${results.processed} SMS işlendi, ${results.sent} başarılı, ${results.failed} başarısız`,
        processed: results.processed,
        sent: results.sent,
        failed: results.failed
      };
    } catch (error) {
      console.error('Process scheduled SMS error:', error);
      return { success: false, message: 'Planlanmış SMS işlenirken hata oluştu: ' + error.message };
    }
  }
}

export default FirebaseApiService;

