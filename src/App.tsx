import React, { useState, useEffect, useCallback } from "react";
import { User, Role, Assignment, AssignmentStatus, Attachment } from "./types";
import { StudentDashboard } from "./components/StudentDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoginPage } from "./components/LoginPage";
import { IconLogOut } from "./components/Icons";
import { db } from "./services/db";
import { authService } from "./services/auth";
import { ToastContainer, toast } from "react-toastify";
import { fileToBase64 } from "./utils";
import "./App.css";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // --- DATA LOADING ---
  const loadData = useCallback(async (user: User) => {
    setIsFetching(true);
    try {
      if (user.role === Role.ADMIN) {
        const [studentsData, assignmentsData] = await Promise.all([
          db.users.findAll(Role.STUDENT),
          db.assignments.find(),
        ]);
        setAllStudents(studentsData);
        setAssignments(assignmentsData);
      } else {
        const assignmentsData = await db.assignments.find({
          assignedTo: user.id,
        });
        setAssignments(assignmentsData);
      }
    } catch (error) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setIsFetching(false);
    }
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initApp = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await loadData(user);
      }
      setIsLoading(false);
    };
    initApp();
  }, [loadData]);

  // --- AUTH HANDLERS ---
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadData(user);
    toast.success(`Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setAssignments([]);
    toast.info("Logged out successfully");
  };

  // --- ACTION HANDLERS (Optimized with Local State Updates) ---
  const handleUpload = async (assignmentId: string, files: FileList) => {
    const currentAssignment = assignments.find((a) => a.id === assignmentId);
    if (!currentAssignment) return;

    setIsFetching(true);
    try {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await fileToBase64(file);
        newAttachments.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          url: base64,
          type: file.type,
          createdAt: new Date().toISOString(),
        });
      }

      const updatedFiles = [
        ...(currentAssignment.submittedFiles || []),
        ...newAttachments,
      ];
      const updatedAssignment = await db.assignments.updateOne(assignmentId, {
        status: AssignmentStatus.SUBMITTED,
        submittedFiles: updatedFiles,
        submittedAt: new Date().toISOString(),
      });

      if (updatedAssignment) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignmentId ? updatedAssignment : a))
        );
        toast.success("Answer script uploaded!");
      }
    } catch (error) {
      toast.error("Failed to upload scripts");
    } finally {
      setIsFetching(false);
    }
  };

  const handleDeleteFile = async (assignmentId: string, fileId: string) => {
    const currentAssignment = assignments.find((a) => a.id === assignmentId);
    if (!currentAssignment) return;

    setIsFetching(true);
    try {
      const currentFiles = currentAssignment.submittedFiles || [];
      const updatedFiles = currentFiles.filter((f) => f.id !== fileId);
      const newStatus =
        updatedFiles.length === 0
          ? AssignmentStatus.PENDING
          : AssignmentStatus.SUBMITTED;

      const updatedAssignment = await db.assignments.updateOne(assignmentId, {
        submittedFiles: updatedFiles,
        status: newStatus,
      });

      if (updatedAssignment) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === assignmentId ? updatedAssignment : a))
        );
        toast.info("File removed");
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleAssign = async (
    newAssignment: Omit<Assignment, "id" | "status" | "submittedFiles">
  ) => {
    setIsFetching(true);
    try {
      const assignment: Assignment = {
        ...newAssignment,
        id: Date.now().toString(),
        status: AssignmentStatus.PENDING,
        submittedFiles: [],
      };

      const created = await db.assignments.insertOne(assignment);
      if (created) {
        setAssignments((prev) => [created, ...prev]);
        toast.success("Assignment sent successfully!");
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      setIsFetching(true);
      try {
        const success = await db.assignments.delete(id);
        if (success) {
          setAssignments((prev) => prev.filter((a) => a.id !== id));
          toast.info("Assignment deleted");
        }
      } finally {
        setIsFetching(false);
      }
    }
  };

  const handleGrade = async (id: string, score: number, remarks: string) => {
    setIsFetching(true);
    try {
      const updatedAssignment = await db.assignments.updateOne(id, {
        status: AssignmentStatus.GRADED,
        score,
        remarks,
      });
      if (updatedAssignment) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === id ? updatedAssignment : a))
        );
        toast.success("Grading submitted!");
      }
    } finally {
      setIsFetching(false);
    }
  };

  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />

      {/* Non-intrusive Global Fetching Loader */}
      {isFetching && (
        <div className="fetching-overlay">
          <div className="spinner-sm"></div>
          <span className="fetching-text">Syncing...</span>
        </div>
      )}

      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div>
            <h1 className="logo-title">MathConnect</h1>
            <p className="logo-subtitle hidden-mobile">
              Excellence in Learning
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mobile-menu-btn hidden-desktop"
          >
            <IconLogOut style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
        </div>

        <div className="sidebar-content hidden-mobile">
          <div className="sidebar-footer">
            <div className="user-profile-mini">
              <div className="mini-avatar">{currentUser.name.charAt(0)}</div>
              <div className="user-info-mini">
                <p className="user-name">{currentUser.name}</p>
                <p className="user-role">{currentUser.role.toLowerCase()}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-signout">
              <IconLogOut style={{ width: "1rem", height: "1rem" }} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {currentUser.role === Role.STUDENT ? (
          <StudentDashboard
            user={currentUser}
            assignments={assignments}
            onUpload={handleUpload}
            onDeleteFile={handleDeleteFile}
          />
        ) : (
          <AdminDashboard
            students={allStudents}
            assignments={assignments}
            onAssign={handleAssign}
            onDelete={handleDeleteAssignment}
            onGrade={handleGrade}
          />
        )}
      </main>
    </div>
  );
};

export default App;
