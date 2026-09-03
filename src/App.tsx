import React, { useState, useEffect, useCallback } from 'react';
import {
  AppTab,
  ClassRoom,
  HistoryRecord,
  SelectionMode,
  SpinSettings,
  Student,
  QuestionItem,
  TimetableSlot,
  TeachingPlanItem,
  UserSubscription,
} from './types';
import {
  loadClasses,
  saveClasses,
  loadActiveClassId,
  saveActiveClassId,
  loadHistory,
  saveHistory,
  loadSettings,
  saveSettings,
  loadSelectionMode,
  saveSelectionMode,
  loadTimetable,
  saveTimetable,
  loadTeachingPlan,
  saveTeachingPlan,
  DEFAULT_SETTINGS,
} from './utils/storage';
import { INITIAL_CLASSES } from './utils/sampleData';
import { soundEngine } from './utils/audio';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  fetchUserDataFromFirestore,
  saveUserDataToFirestore,
  subscribeToUserData,
  getEffectiveSubscription,
  ensureUserSubscription,
} from './utils/firestoreService';

import { Navbar } from './components/Navbar';
import { SpinScreen } from './components/SpinScreen';
import { PresentationOverlay } from './components/PresentationOverlay';
import { ClassManager } from './components/ClassManager';
import { ExcelImportScreen } from './components/ExcelImportScreen';
import { StatsScreen } from './components/StatsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { TimerWidget } from './components/TimerWidget';
import { QuestionBankModal } from './components/QuestionBankModal';
import { QuickAttendanceModal } from './components/QuickAttendanceModal';
import { GroupGeneratorModal } from './components/GroupGeneratorModal';
import { MathQuestionSpotlightModal } from './components/MathQuestionSpotlightModal';
import { TimetableScreen } from './components/TimetableScreen';
import { GradebookScreen } from './components/GradebookScreen';
import { AuthModal } from './components/AuthModal';
import { UpgradeProModal } from './components/UpgradeProModal';
import { PaymentHistoryModal } from './components/PaymentHistoryModal';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';

export default function App() {
  // 1. Core State
  const [classes, setClasses] = useState<ClassRoom[]>(() => loadClasses());
  const [activeClassId, setActiveClassId] = useState<string>(() => loadActiveClassId(classes));
  const [history, setHistory] = useState<HistoryRecord[]>(() => loadHistory());
  const [settings, setSettings] = useState<SpinSettings>(() => loadSettings());
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => loadSelectionMode());
  const [currentTab, setCurrentTab] = useState<AppTab>('SPIN');
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [lastHistoryRecord, setLastHistoryRecord] = useState<HistoryRecord | null>(null);

  // Classroom Tool States
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<QuestionItem | null>(null);
  const [spotlightQuestion, setSpotlightQuestion] = useState<QuestionItem | null>(null);

  // Authentication & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Subscription & Payment State
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);

  // Timetable & Teaching Plan State
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => loadTimetable());
  const [teachingPlan, setTeachingPlan] = useState<TeachingPlanItem[]>(() => loadTeachingPlan());

  // Listen to Firebase Auth state change & real-time Firestore sync
  useEffect(() => {
    let unsubFirestoreUser: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (unsubFirestoreUser) {
        unsubFirestoreUser();
        unsubFirestoreUser = null;
      }

      if (user) {
        // Logged in: load user's data from Firestore
        setIsSyncingCloud(true);
        try {
          const cloudData = await fetchUserDataFromFirestore(user.uid);

          // 1. Ensure user has an effective subscription (init 15-day trial if new)
          const sub = await ensureUserSubscription(user.uid, cloudData);
          setSubscription(sub);
          if (sub.status === 'EXPIRED') {
            setIsExpiredModalOpen(true);
          }

          // 2. Real-time listener for Firestore document updates (e.g. Pro activation)
          unsubFirestoreUser = subscribeToUserData(user.uid, (data) => {
            if (data?.subscription) {
              const effective = getEffectiveSubscription(data.subscription);
              setSubscription(effective);
            }
          });

          if (cloudData && cloudData.classes && cloudData.classes.length > 0) {
            setClasses(cloudData.classes);
            saveClasses(cloudData.classes);

            if (cloudData.activeClassId) {
              setActiveClassId(cloudData.activeClassId);
              saveActiveClassId(cloudData.activeClassId);
            }
            if (cloudData.history) {
              setHistory(cloudData.history);
              saveHistory(cloudData.history);
            }
            if (cloudData.settings) {
              setSettings(cloudData.settings);
              saveSettings(cloudData.settings);
            }
            if (cloudData.selectionMode) {
              setSelectionMode(cloudData.selectionMode);
              saveSelectionMode(cloudData.selectionMode);
            }
            if (cloudData.timetableSlots) {
              setTimetable(cloudData.timetableSlots);
              saveTimetable(cloudData.timetableSlots);
            }
            if (cloudData.teachingPlan) {
              setTeachingPlan(cloudData.teachingPlan);
              saveTeachingPlan(cloudData.teachingPlan);
            }
          } else {
            // First time login with no cloud data: upload current local data to Firestore
            await saveUserDataToFirestore(user.uid, {
              classes: loadClasses(),
              activeClassId: loadActiveClassId(loadClasses()),
              history: loadHistory(),
              settings: loadSettings(),
              selectionMode: loadSelectionMode(),
              timetableSlots: loadTimetable(),
              teachingPlan: loadTeachingPlan(),
            });
          }
        } catch (error) {
          console.error('Failed to sync data with Firestore on auth change:', error);
        } finally {
          setIsSyncingCloud(false);
        }
      } else {
        setSubscription(null);
      }
    });

    return () => {
      unsubscribe();
      if (unsubFirestoreUser) unsubFirestoreUser();
    };
  }, []);

  // Helper to sync changes to Firestore in the background if user is logged in
  const syncToCloudIfLoggedIn = useCallback((partialData: any) => {
    if (auth.currentUser) {
      saveUserDataToFirestore(auth.currentUser.uid, partialData).catch((err) => {
        console.warn('Background cloud sync warning:', err);
      });
    }
  }, []);

  // Manual trigger to sync current state to Firestore
  const handleSyncCloudNow = useCallback(async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSyncingCloud(true);
    try {
      await saveUserDataToFirestore(currentUser.uid, {
        classes,
        activeClassId,
        history,
        settings,
        selectionMode,
        timetableSlots: timetable,
        teachingPlan,
      });
      soundEngine.playVictoryFanfare();
    } catch (err) {
      console.error('Manual sync failed:', err);
      alert('Đồng bộ Cloud không thành công. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setIsSyncingCloud(false);
    }
  }, [currentUser, classes, activeClassId, history, settings, selectionMode, timetable, teachingPlan]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      soundEngine.playTick(1.2);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  const handleUpdateTimetable = useCallback((slots: TimetableSlot[]) => {
    setTimetable(slots);
    saveTimetable(slots);
    syncToCloudIfLoggedIn({ timetableSlots: slots });
  }, [syncToCloudIfLoggedIn]);

  const handleUpdateTeachingPlan = useCallback((plan: TeachingPlanItem[]) => {
    setTeachingPlan(plan);
    saveTeachingPlan(plan);
    syncToCloudIfLoggedIn({ teachingPlan: plan });
  }, [syncToCloudIfLoggedIn]);

  // Sync sound setting
  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
    soundEngine.setVolume(settings.volume);
  }, [settings.soundEnabled, settings.volume]);

  // Persist classes
  const handleUpdateClasses = useCallback((newClasses: ClassRoom[]) => {
    setClasses(newClasses);
    saveClasses(newClasses);
    syncToCloudIfLoggedIn({ classes: newClasses });
  }, [syncToCloudIfLoggedIn]);

  // Persist active class
  const handleSelectClass = useCallback((id: string) => {
    setActiveClassId(id);
    saveActiveClassId(id);
    syncToCloudIfLoggedIn({ activeClassId: id });
  }, [syncToCloudIfLoggedIn]);

  // Persist history
  const handleUpdateHistory = useCallback((newHistory: HistoryRecord[]) => {
    setHistory(newHistory);
    saveHistory(newHistory);
    syncToCloudIfLoggedIn({ history: newHistory });
  }, [syncToCloudIfLoggedIn]);

  // Persist settings
  const handleUpdateSettings = useCallback((newSettings: SpinSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    syncToCloudIfLoggedIn({ settings: newSettings });
  }, [syncToCloudIfLoggedIn]);

  // Persist selection mode
  const handleToggleSelectionMode = useCallback(() => {
    const nextMode: SelectionMode = selectionMode === 'FAIR' ? 'PURE' : 'FAIR';
    setSelectionMode(nextMode);
    saveSelectionMode(nextMode);
    syncToCloudIfLoggedIn({ selectionMode: nextMode });
  }, [selectionMode, syncToCloudIfLoggedIn]);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const next = !settings.soundEnabled;
    const updated = { ...settings, soundEnabled: next };
    setSettings(updated);
    saveSettings(updated);
    soundEngine.setEnabled(next);
  }, [settings]);

  // Get active class object
  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0] || {
    id: 'class-default',
    name: 'Mặc định',
    students: [],
    createdAt: new Date().toISOString(),
  };

  // Called when single student is chosen in spin
  const handleStudentSelected = useCallback(
    (selectedStudent: Student, mode: SelectionMode, score?: string, note?: string) => {
      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Update student's call count in class
      let updatedCallCount = selectedStudent.callCount || 0;

      const updatedClasses = classes.map((cls) => {
        if (cls.id === activeClass.id) {
          const updatedStudents = cls.students.map((s) => {
            if (s.id === selectedStudent.id) {
              // If this is an update to existing record score/note
              if (lastHistoryRecord && lastHistoryRecord.studentId === s.id && (score !== undefined || note !== undefined)) {
                return { ...s, notes: note || s.notes };
              }
              updatedCallCount = (s.callCount || 0) + 1;
              return {
                ...s,
                callCount: updatedCallCount,
                lastCalledAt: now.toISOString(),
                notes: note || s.notes,
              };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });

      handleUpdateClasses(updatedClasses);

      // Create or update history record
      if (lastHistoryRecord && lastHistoryRecord.studentId === selectedStudent.id && (score !== undefined || note !== undefined)) {
        const updatedHistory = history.map((h) => {
          if (h.id === lastHistoryRecord.id) {
            return { ...h, score: score || h.score, note: note || h.note };
          }
          return h;
        });
        handleUpdateHistory(updatedHistory);
      } else {
        const newRecord: HistoryRecord = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: now.toISOString(),
          formattedDate,
          formattedTime,
          classId: activeClass.id,
          className: activeClass.name,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          callCountAfter: updatedCallCount,
          mode,
          score,
          note,
        };
        const newHistory = [newRecord, ...history];
        handleUpdateHistory(newHistory);
        setLastHistoryRecord(newRecord);
      }
    },
    [activeClass, classes, history, lastHistoryRecord, handleUpdateClasses, handleUpdateHistory]
  );

  // Called when multiple students are selected together in multi-pick mode
  const handleBatchStudentsSelected = useCallback(
    (selectedStudents: Student[], mode: SelectionMode) => {
      if (!selectedStudents || selectedStudents.length === 0) return;
      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const selectedIds = new Set(selectedStudents.map((s) => s.id));
      const newHistoryRecords: HistoryRecord[] = [];

      const updatedClasses = classes.map((cls) => {
        if (cls.id === activeClass.id) {
          const updatedStudents = cls.students.map((s) => {
            if (selectedIds.has(s.id)) {
              const updatedCallCount = (s.callCount || 0) + 1;
              newHistoryRecords.push({
                id: `hist-${Date.now()}-${s.id}-${Math.random().toString(36).substr(2, 4)}`,
                timestamp: now.toISOString(),
                formattedDate,
                formattedTime,
                classId: activeClass.id,
                className: activeClass.name,
                studentId: s.id,
                studentName: s.name,
                callCountAfter: updatedCallCount,
                mode,
              });
              return {
                ...s,
                callCount: updatedCallCount,
                lastCalledAt: now.toISOString(),
              };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });

      handleUpdateClasses(updatedClasses);
      const newHistory = [...newHistoryRecords, ...history];
      handleUpdateHistory(newHistory);
      if (newHistoryRecords.length > 0) {
        setLastHistoryRecord(newHistoryRecords[0]);
      }
    },
    [activeClass, classes, history, handleUpdateClasses, handleUpdateHistory]
  );

  // Undo student selection (e.g. if absent)
  const handleUndoLastSelection = useCallback(
    (recordId: string) => {
      const targetRecord = history.find((h) => h.id === recordId);
      if (!targetRecord) return;

      // Decrement student count
      const updatedClasses = classes.map((cls) => {
        if (cls.id === targetRecord.classId) {
          const updatedStudents = cls.students.map((s) => {
            if (s.id === targetRecord.studentId) {
              return {
                ...s,
                callCount: Math.max(0, (s.callCount || 1) - 1),
              };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });

      handleUpdateClasses(updatedClasses);

      // Remove from history
      const updatedHistory = history.filter((h) => h.id !== recordId);
      handleUpdateHistory(updatedHistory);
      setLastHistoryRecord(null);
    },
    [classes, history, handleUpdateClasses, handleUpdateHistory]
  );

  // Handle single class update (add/edit/delete students)
  const handleUpdateSingleClass = useCallback(
    (updatedClass: ClassRoom) => {
      const updated = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
      handleUpdateClasses(updated);
    },
    [classes, handleUpdateClasses]
  );

  // Create new class
  const handleCreateNewClass = useCallback(
    (name: string, subject?: string) => {
      const newClass: ClassRoom = {
        id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        subject,
        students: [],
        createdAt: new Date().toISOString(),
      };
      const updated = [...classes, newClass];
      handleUpdateClasses(updated);
      handleSelectClass(newClass.id);
    },
    [classes, handleUpdateClasses, handleSelectClass]
  );

  // Delete class
  const handleDeleteClass = useCallback(
    (id: string) => {
      if (classes.length <= 1) {
        alert('Cần giữ lại ít nhất 1 lớp học!');
        return;
      }
      const updated = classes.filter((c) => c.id !== id);
      handleUpdateClasses(updated);
      if (activeClassId === id) {
        handleSelectClass(updated[0].id);
      }
    },
    [classes, activeClassId, handleUpdateClasses, handleSelectClass]
  );

  // Award stars / badges to student
  const handleAwardStars = useCallback(
    (studentId: string, count: number = 1) => {
      const updatedClasses = classes.map((cls) => {
        if (cls.id === activeClass.id) {
          const updatedStudents = cls.students.map((s) => {
            if (s.id === studentId) {
              return {
                ...s,
                stars: (s.stars || 0) + count,
              };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });
      handleUpdateClasses(updatedClasses);
    },
    [activeClass.id, classes, handleUpdateClasses]
  );

  // Handle Excel Import Success
  const handleImportSuccess = useCallback(
    (targetId: string, importedStudents: Student[], mode: 'REPLACE' | 'APPEND', newClassName?: string) => {
      if (newClassName) {
        // Create new class with imported students
        const newClass: ClassRoom = {
          id: `class-import-${Date.now()}`,
          name: newClassName,
          students: importedStudents,
          createdAt: new Date().toISOString(),
        };
        const updated = [...classes, newClass];
        handleUpdateClasses(updated);
        handleSelectClass(newClass.id);
      } else {
        const updated = classes.map((cls) => {
          if (cls.id === targetId) {
            const finalStudents =
              mode === 'REPLACE'
                ? importedStudents
                : [...cls.students, ...importedStudents];
            return { ...cls, students: finalStudents };
          }
          return cls;
        });
        handleUpdateClasses(updated);
        handleSelectClass(targetId);
      }
      setCurrentTab('SPIN');
    },
    [classes, handleUpdateClasses, handleSelectClass]
  );

  // Reset counts for single class
  const handleResetClassCounts = useCallback(
    (classId: string) => {
      const updated = classes.map((cls) => {
        if (cls.id === classId) {
          const resetStudents = cls.students.map((s) => ({ ...s, callCount: 0 }));
          return { ...cls, students: resetStudents };
        }
        return cls;
      });
      handleUpdateClasses(updated);
    },
    [classes, handleUpdateClasses]
  );

  // Reset counts for all classes
  const handleResetAllClassesCounts = useCallback(() => {
    const updated = classes.map((cls) => ({
      ...cls,
      students: cls.students.map((s) => ({ ...s, callCount: 0 })),
    }));
    handleUpdateClasses(updated);
  }, [classes, handleUpdateClasses]);

  // Restore default initial classes
  const handleRestoreDefaultData = useCallback(() => {
    handleUpdateClasses(INITIAL_CLASSES);
    handleSelectClass(INITIAL_CLASSES[0].id);
    handleUpdateHistory([]);
    handleUpdateSettings(DEFAULT_SETTINGS);
  }, [handleUpdateClasses, handleSelectClass, handleUpdateHistory, handleUpdateSettings]);

  // Reload after JSON backup restore
  const handleImportBackupSuccess = useCallback(() => {
    const freshClasses = loadClasses();
    setClasses(freshClasses);
    setActiveClassId(loadActiveClassId(freshClasses));
    setHistory(loadHistory());
    setSettings(loadSettings());
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        classes={classes}
        activeClassId={activeClassId}
        onSelectClass={handleSelectClass}
        selectionMode={selectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        soundEnabled={settings.soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onAddNewClass={() => {
          const name = prompt('Nhập tên lớp mới (Ví dụ: 7A3, 8A2...):');
          if (name && name.trim()) {
            handleCreateNewClass(name.trim());
          }
        }}
        currentUser={currentUser}
        subscription={subscription || undefined}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        isSyncingCloud={isSyncingCloud}
        onSyncCloudNow={handleSyncCloudNow}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        onOpenPaymentHistoryModal={() => setIsPaymentHistoryModalOpen(true)}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 pb-12">
        {currentTab === 'SPIN' && (
          <SpinScreen
            activeClass={activeClass}
            selectionMode={selectionMode}
            onToggleSelectionMode={handleToggleSelectionMode}
            settings={settings}
            onStudentSelected={handleStudentSelected}
            onBatchStudentsSelected={handleBatchStudentsSelected}
            onUndoLastSelection={handleUndoLastSelection}
            lastHistoryRecord={lastHistoryRecord}
            onOpenPresentation={() => setIsPresentationOpen(true)}
            onOpenTimer={() => setIsTimerOpen(true)}
            onOpenQuestions={() => setIsQuestionBankOpen(true)}
            onOpenAttendance={() => setIsAttendanceOpen(true)}
            onOpenGroups={() => setIsGroupsOpen(true)}
            onAwardStars={handleAwardStars}
            onOpenQuestionSpotlight={(q) => setSpotlightQuestion(q)}
            activeQuestion={activeQuestion}
            onClearActiveQuestion={() => setActiveQuestion(null)}
          />
        )}

        {currentTab === 'TIMETABLE' && (
          <TimetableScreen
            classes={classes}
            timetable={timetable}
            onUpdateTimetable={handleUpdateTimetable}
            teachingPlan={teachingPlan}
            onUpdateTeachingPlan={handleUpdateTeachingPlan}
            onSelectClassAndSpin={(classId) => {
              handleSelectClass(classId);
              setCurrentTab('SPIN');
            }}
          />
        )}

        {currentTab === 'GRADEBOOK' && (
          <GradebookScreen
            classes={classes}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            onUpdateClassStudents={(cId, stds) => {
              const updated = classes.map((c) =>
                c.id === cId ? { ...c, students: stds, updatedAt: new Date().toISOString() } : c
              );
              handleUpdateClasses(updated);
            }}
            onUpdateAllClasses={handleUpdateClasses}
            onAwardStars={handleAwardStars}
          />
        )}

        {currentTab === 'CLASSES' && (
          <ClassManager
            classes={classes}
            activeClassId={activeClassId}
            onSelectClass={handleSelectClass}
            onCreateClass={handleCreateNewClass}
            onDeleteClass={handleDeleteClass}
            onUpdateClass={handleUpdateSingleClass}
            onNavigateToImport={() => setCurrentTab('IMPORT')}
          />
        )}

        {currentTab === 'IMPORT' && (
          <ExcelImportScreen
            classes={classes}
            activeClassId={activeClassId}
            onImportSuccess={handleImportSuccess}
            onCancel={() => setCurrentTab('CLASSES')}
          />
        )}

        {currentTab === 'STATS' && <StatsScreen activeClass={activeClass} />}

        {currentTab === 'HISTORY' && (
          <HistoryScreen
            history={history}
            classes={classes}
            onClearHistory={() => handleUpdateHistory([])}
          />
        )}

        {currentTab === 'SETTINGS' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            classes={classes}
            activeClassId={activeClassId}
            onResetClassCounts={handleResetClassCounts}
            onResetAllClassesCounts={handleResetAllClassesCounts}
            onRestoreDefaultData={handleRestoreDefaultData}
            onImportBackupSuccess={handleImportBackupSuccess}
            currentUser={currentUser}
            subscription={subscription || undefined}
            onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            onOpenPaymentHistoryModal={() => setIsPaymentHistoryModalOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Quick Attendance Modal (Optimization #1) */}
      <QuickAttendanceModal
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        activeClass={activeClass}
        onUpdateStudents={(updatedStudents) => {
          handleUpdateSingleClass({
            ...activeClass,
            students: updatedStudents,
          });
        }}
      />

      {/* Random Group Generator Modal (Optimization #2) */}
      <GroupGeneratorModal
        isOpen={isGroupsOpen}
        onClose={() => setIsGroupsOpen(false)}
        activeClass={activeClass}
      />

      {/* Floating Classroom Timer Widget */}
      <TimerWidget isOpen={isTimerOpen} onClose={() => setIsTimerOpen(false)} />

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={isQuestionBankOpen}
        onClose={() => setIsQuestionBankOpen(false)}
        activeSubject={activeClass.subject}
        onOpenSpotlight={(q) => {
          setSpotlightQuestion(q);
        }}
        onSelectQuestion={(q) => {
          setActiveQuestion(q);
          setIsQuestionBankOpen(false);
        }}
      />

      {/* Math Spotlight Fullscreen Modal */}
      <MathQuestionSpotlightModal
        question={spotlightQuestion}
        isOpen={!!spotlightQuestion}
        onClose={() => setSpotlightQuestion(null)}
      />

      {/* Fullscreen / Projector Presentation Overlay (Optimizations #3, #4, #5) */}
      {isPresentationOpen && (
        <PresentationOverlay
          activeClass={activeClass}
          selectionMode={selectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          settings={settings}
          onStudentSelected={handleStudentSelected}
          onBatchStudentsSelected={handleBatchStudentsSelected}
          onClose={() => setIsPresentationOpen(false)}
          onOpenTimer={() => setIsTimerOpen(true)}
          onOpenQuestions={() => setIsQuestionBankOpen(true)}
          onAwardStars={handleAwardStars}
          activeQuestion={activeQuestion}
        />
      )}

      {/* Authentication & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Upgrade to ClassGo Pro Modal */}
      <UpgradeProModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentUser={currentUser}
        onRequireLogin={() => {
          setIsUpgradeModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Payment & Order History Modal (including Admin Approval) */}
      <PaymentHistoryModal
        isOpen={isPaymentHistoryModalOpen}
        onClose={() => setIsPaymentHistoryModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Subscription Expired Modal */}
      <SubscriptionExpiredModal
        isOpen={isExpiredModalOpen}
        onClose={() => setIsExpiredModalOpen(false)}
        onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        userEmail={currentUser?.email || undefined}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🎲 <strong>Quay Tên May Mắn – Kiểm Tra Bài Cũ</strong> | Công cụ giảng dạy cho giáo viên</span>
          <span>Thuật toán ưu tiên nhóm ít lên bảng nhất • Không mất dữ liệu khi tải lại trang</span>
        </div>
      </footer>
    </div>
  );
}
