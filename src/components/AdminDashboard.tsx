import React, { useState, useRef } from "react";
import { Assignment, AssignmentStatus, User, Role, Attachment } from "../types";
// import { generateConstructiveRemarks } from "../services/geminiService";
import {
  IconCheck,
  IconFile,
  IconSparkles,
  IconDownload,
  IconAnalytics,
  IconPlus,
  IconX,
  IconUser,
  IconTrash,
  IconEdit,
  IconChevronRight,
} from "./Icons";
import { db } from "../services/db";
import { toast } from "react-toastify";
import { fileToBase64, downloadBase64Data } from "../utils";
import "./AdminDashboard.css";

interface AdminDashboardProps {
  students: User[];
  assignments: Assignment[];
  onAssign: (
    assignment: Omit<Assignment, "id" | "status" | "submittedFiles">
  ) => void;
  onGrade: (assignmentId: string, score: number, remarks: string) => void;
  onDelete: (assignmentId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  assignments,
  onAssign,
  onGrade,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "ASSIGNMENTS" | "STUDENTS"
  >("OVERVIEW");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<
    string | null
  >(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    password: "",
    class: "",
    phone: "",
  });

  // Create Assignment State
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [selectedStudent, setSelectedStudent] = useState(students[0]?.id || "");
  const [uploadedQPs, setUploadedQPs] = useState<Attachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gradingId, setGradingId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<string>("");
  const [remarksInput, setRemarksInput] = useState<string>("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Active assignments are those that are NOT GRADED yet (PENDING or SUBMITTED)
  const activeAssignments = assignments.filter(
    (a) => a.status !== AssignmentStatus.GRADED
  );
  const pendingGradingCount = assignments.filter(
    (a) => a.status === AssignmentStatus.SUBMITTED
  ).length;

  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({ name: "", email: "", password: "", class: "", phone: "" });
    setIsStudentModalOpen(true);
  };

  const openEditStudent = (student: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      email: student.email,
      password: "",
      class: student.class || "",
      phone: student.phone || "",
    });
    setIsStudentModalOpen(true);
  };

  const handleDeleteStudent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        "Are you sure? This will delete the student and all their assignments."
      )
    ) {
      await db.users.delete(id);
      toast.success("Student deleted successfully");
      window.location.reload();
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const updates: any = {
          name: studentForm.name,
          email: studentForm.email,
          class: studentForm.class,
          phone: studentForm.phone,
        };
        if (studentForm.password) updates.password = studentForm.password;
        await db.users.update(editingStudent.id, updates);
        toast.success("Student updated");
      } else {
        const newUser: Partial<User> = {
          id: Date.now().toString(),
          name: studentForm.name,
          email: studentForm.email,
          password: studentForm.password || "password123",
          role: Role.STUDENT,
          class: studentForm.class,
          phone: studentForm.phone,
          joinDate: new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        };
        await db.users.create(newUser);
        toast.success("New student added");
      }
      setIsStudentModalOpen(false);
      window.location.reload();
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      try {
        const newAttachments: Attachment[] = await Promise.all(
          files.map(async (file) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: await fileToBase64(file),
            type: file.type,
            createdAt: new Date().toISOString(),
          }))
        );

        setUploadedQPs((prev) => [...prev, ...newAttachments]);
        toast.success(`${files.length} file(s) attached`);
      } catch (err) {
        toast.error("Failed to process files");
      }
      // Reset input
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveQP = (id: string) => {
    setUploadedQPs((prev) => prev.filter((qp) => qp.id !== id));
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign({
      title: newTitle,
      subject: newSubject,
      description: newDesc,
      dueDate: newDueDate,
      assignedTo: selectedStudent,
      questionPapers: uploadedQPs,
      maxScore: 100,
    });
    setNewTitle("");
    setNewDesc("");
    setUploadedQPs([]);
    setNewDueDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
    setIsAssignModalOpen(false);
  };

  const startGrading = (assignment: Assignment) => {
    setGradingId(assignment.id);
    setScoreInput("");
    setRemarksInput("");
  };

  //   const handleGenerateRemarks = async (assignment: Assignment) => {
  //     const scoreVal = parseInt(scoreInput);
  //     if (isNaN(scoreVal)) {
  //       toast.warning("Please enter a valid score first.");
  //       return;
  //     }

  //     setIsGeneratingAI(true);
  //     const student = students.find((s) => s.id === assignment.assignedTo);
  //     if (student) {
  //       const generated = await generateConstructiveRemarks(
  //         student.name,
  //         assignment.title,
  //         scoreVal,
  //         assignment.maxScore
  //       );
  //       setRemarksInput(generated);
  //     }
  //     setIsGeneratingAI(false);
  //   };

  const submitGrade = (id: string) => {
    onGrade(id, parseInt(scoreInput) || 0, remarksInput);
    setGradingId(null);
  };

  const getStudentStats = (studentId: string) => {
    const studentAssignments = assignments.filter(
      (a) => a.assignedTo === studentId
    );
    const total = studentAssignments.length;
    const graded = studentAssignments.filter(
      (a) => a.status === AssignmentStatus.GRADED
    );
    const submitted = studentAssignments.filter(
      (a) => a.status !== AssignmentStatus.PENDING
    );

    let totalMaxScore = 0;
    let totalScore = 0;

    graded.forEach((a) => {
      totalScore += a.score || 0;
      totalMaxScore += a.maxScore;
    });

    const avgScore =
      totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    return {
      total,
      graded: graded.length,
      submitted: submitted.length,
      avgScore,
      pending: studentAssignments.filter(
        (a) => a.status === AssignmentStatus.SUBMITTED
      ).length,
    };
  };

  const AnalyticsView = () => {
    const totalStudents = students.length;
    const gradedAssignments = assignments.filter(
      (a) => a.status === AssignmentStatus.GRADED
    );
    const avgScore =
      gradedAssignments.length > 0
        ? Math.round(
            (gradedAssignments.reduce(
              (acc, curr) => acc + (curr.score || 0),
              0
            ) /
              gradedAssignments.reduce((acc, curr) => acc + curr.maxScore, 0)) *
              100
          )
        : 0;

    const recentActivity = [...assignments]
      .sort((a, b) => parseInt(b.id) - parseInt(a.id))
      .slice(0, 5);
    const scores = gradedAssignments.map((a) => (a.score! / a.maxScore) * 100);
    const excellent = scores.filter((s) => s >= 90).length;
    const good = scores.filter((s) => s >= 75 && s < 90).length;
    const average = scores.filter((s) => s >= 50 && s < 75).length;
    const needsImprovement = scores.filter((s) => s < 50).length;
    const totalGraded = scores.length || 1;

    return (
      <div className="admin-dashboard animate-fade-in">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper indigo">
              <IconAnalytics style={{ width: "1.5rem", height: "1.5rem" }} />
            </div>
            <div>
              <p className="stat-value">{totalStudents}</p>
              <p className="stat-label">Total Students</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper amber">
              <IconFile style={{ width: "1.5rem", height: "1.5rem" }} />
            </div>
            <div>
              <p className="stat-value">{pendingGradingCount}</p>
              <p className="stat-label">Pending Grading</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper emerald">
              <IconSparkles style={{ width: "1.5rem", height: "1.5rem" }} />
            </div>
            <div>
              <p className="stat-value">{avgScore}%</p>
              <p className="stat-label">Average Score</p>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-panel">
            <div className="panel-header">
              <h3 className="panel-title">Recent Activity</h3>
            </div>
            <div className="activity-list">
              {recentActivity.map((item) => {
                const student = students.find((s) => s.id === item.assignedTo);
                return (
                  <div key={item.id} className="activity-item">
                    <div>
                      <p
                        style={{
                          fontWeight: "600",
                          fontSize: "0.875rem",
                          color: "#0f172a",
                        }}
                      >
                        {item.title}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Assigned to: {student?.name}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "99px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h3 className="panel-title">Class Performance</h3>
            </div>
            <div className="performance-chart">
              {[
                {
                  label: "Excellent (90%+)",
                  count: excellent,
                  color: "#10b981",
                },
                { label: "Good (75-89%)", count: good, color: "#6366f1" },
                { label: "Average (50-74%)", count: average, color: "#fbbf24" },
                {
                  label: "Needs Improvement (<50%)",
                  count: needsImprovement,
                  color: "#f87171",
                },
              ].map((stat, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#334155" }}>
                      {stat.label}
                    </span>
                    <span style={{ color: "#64748b" }}>
                      {stat.count} students
                    </span>
                  </div>
                  <div
                    style={{
                      height: "0.5rem",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "99px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "99px",
                        backgroundColor: stat.color,
                        width: `${(stat.count / totalGraded) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StudentsListView = () => {
    return (
      <div className="students-grid">
        {students.map((student) => {
          const stats = getStudentStats(student.id);
          return (
            <div
              key={student.id}
              onClick={() => setSelectedStudentForDetail(student.id)}
              className="student-card"
            >
              <div className="student-card-top">
                <div className="student-avatar">{student.name.charAt(0)}</div>
                <div className="student-info">
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>
                    {student.name}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#64748b",
                      fontSize: "0.875rem",
                    }}
                  >
                    {student.class}
                  </p>
                  <p
                    style={{ margin: 0, color: "#94a3b8", fontSize: "0.75rem" }}
                  >
                    {student.email}
                  </p>
                </div>
              </div>

              <div
                className="student-stats"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.875rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Avg Score</span>
                    <span
                      style={{
                        fontWeight: "700",
                        color:
                          stats.avgScore >= 75
                            ? "#059669"
                            : stats.avgScore >= 50
                            ? "#d97706"
                            : "#ef4444",
                      }}
                    >
                      {stats.avgScore}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "0.375rem",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "99px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: "99px",
                        backgroundColor:
                          stats.avgScore >= 75
                            ? "#10b981"
                            : stats.avgScore >= 50
                            ? "#fbbf24"
                            : "#f87171",
                        width: `${stats.avgScore}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid #f8fafc",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      Assigned
                    </p>
                    <p style={{ fontWeight: "700", color: "#334155" }}>
                      {stats.total}
                    </p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      Pending
                    </p>
                    <p style={{ fontWeight: "700", color: "#4f46e5" }}>
                      {stats.pending}
                    </p>
                  </div>
                </div>
              </div>

              <div className="student-actions">
                <button
                  onClick={(e) => openEditStudent(student, e)}
                  className="action-icon-btn"
                  title="Edit Student"
                >
                  <IconEdit style={{ width: "1rem", height: "1rem" }} />
                </button>
                <button
                  onClick={(e) => handleDeleteStudent(student.id, e)}
                  className="action-icon-btn delete"
                  title="Delete Student"
                >
                  <IconTrash style={{ width: "1rem", height: "1rem" }} />
                </button>
              </div>
            </div>
          );
        })}

        <button onClick={openAddStudent} className="add-student-card">
          <div
            style={{
              height: "3.5rem",
              width: "3.5rem",
              borderRadius: "50%",
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #e2e8f0",
            }}
          >
            <IconPlus style={{ width: "1.5rem", height: "1.5rem" }} />
          </div>
          <p style={{ fontWeight: "700" }}>Add New Student</p>
        </button>
      </div>
    );
  };

  const StudentDetailModal = () => {
    if (!selectedStudentForDetail) return null;
    const student = students.find((s) => s.id === selectedStudentForDetail);
    if (!student) return null;

    const studentAssignments = assignments.filter(
      (a) => a.assignedTo === student.id
    );
    const stats = getStudentStats(student.id);

    return (
      <div className="modal-overlay">
        <div
          className="modal-container lg"
          style={{
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                className="student-avatar"
                style={{ width: "3rem", height: "3rem", fontSize: "1.25rem" }}
              >
                {student.name.charAt(0)}
              </div>
              <div>
                <h2 className="modal-title">{student.name}</h2>
                <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  {student.class} • {student.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedStudentForDetail(null)}
              className="btn-close"
            >
              <IconX style={{ width: "1.5rem", height: "1.5rem" }} />
            </button>
          </div>

          <div className="modal-content" style={{ overflowY: "auto" }}>
            {/* Stats Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#e0e7ff",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                  border: "1px solid #c7d2fe",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#4f46e5",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                  }}
                >
                  Avg Score
                </p>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#4338ca",
                  }}
                >
                  {stats.avgScore}%
                </p>
              </div>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#d1fae5",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                  border: "1px solid #a7f3d0",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#059669",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                  }}
                >
                  Completed
                </p>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#047857",
                  }}
                >
                  {stats.graded}
                </p>
              </div>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#fef3c7",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                  border: "1px solid #fde68a",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#d97706",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                  }}
                >
                  Pending Grade
                </p>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#b45309",
                  }}
                >
                  {stats.pending}
                </p>
              </div>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                  border: "1px solid #e2e8f0",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: "0.25rem",
                  }}
                >
                  Total Assigned
                </p>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  {stats.total}
                </p>
              </div>
            </div>

            {/* Assignments List */}
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "1rem",
              }}
            >
              Assignment History
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {studentAssignments.length > 0 ? (
                studentAssignments.map((assign) => (
                  <div
                    key={assign.id}
                    style={{
                      padding: "1rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.125rem 0.5rem",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            borderRadius: "0.25rem",
                            textTransform: "uppercase",
                          }}
                        >
                          {assign.subject}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {new Date(assign.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h4
                        style={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "#0f172a",
                          margin: 0,
                        }}
                      >
                        {assign.title}
                      </h4>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.25rem 0.75rem",
                          borderRadius: "99px",
                          backgroundColor:
                            assign.status === AssignmentStatus.GRADED
                              ? "#d1fae5"
                              : assign.status === AssignmentStatus.SUBMITTED
                              ? "#fef3c7"
                              : "#f1f5f9",
                          color:
                            assign.status === AssignmentStatus.GRADED
                              ? "#047857"
                              : assign.status === AssignmentStatus.SUBMITTED
                              ? "#b45309"
                              : "#475569",
                        }}
                      >
                        {assign.status}
                      </span>
                      {assign.status === AssignmentStatus.GRADED ? (
                        <div style={{ textAlign: "right", minWidth: "60px" }}>
                          <p
                            style={{
                              fontSize: "1.125rem",
                              fontWeight: 700,
                              color: "#059669",
                              margin: 0,
                            }}
                          >
                            {assign.score}/{assign.maxScore}
                          </p>
                        </div>
                      ) : (
                        <div style={{ textAlign: "right", minWidth: "60px" }}>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: "#94a3b8",
                              margin: 0,
                            }}
                          >
                            --/--
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  No assignments assigned yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-nav">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`nav-btn ${activeTab === "OVERVIEW" ? "active" : ""}`}
          >
            <IconAnalytics style={{ width: "1rem", height: "1rem" }} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("STUDENTS")}
            className={`nav-btn ${activeTab === "STUDENTS" ? "active" : ""}`}
          >
            <IconUser style={{ width: "1rem", height: "1rem" }} />
            Students
          </button>
          <button
            onClick={() => setActiveTab("ASSIGNMENTS")}
            className={`nav-btn ${activeTab === "ASSIGNMENTS" ? "active" : ""}`}
          >
            <IconFile style={{ width: "1rem", height: "1rem" }} />
            Active Assignments
            {pendingGradingCount > 0 && (
              <span className="notification-pill">{pendingGradingCount}</span>
            )}
          </button>
        </div>

        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="btn-create"
        >
          <IconPlus style={{ width: "1.25rem", height: "1.25rem" }} />
          Assign Work
        </button>
      </div>

      {activeTab === "OVERVIEW" && <AnalyticsView />}
      {activeTab === "STUDENTS" && <StudentsListView />}

      {selectedStudentForDetail && <StudentDetailModal />}

      {activeTab === "ASSIGNMENTS" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            animation: "fadeIn 0.4s ease-out",
          }}
        >
          {activeAssignments.length === 0 ? (
            <div
              style={{
                padding: "5rem",
                textAlign: "center",
                backgroundColor: "white",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  height: "4rem",
                  width: "4rem",
                  backgroundColor: "#e0e7ff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                }}
              >
                <IconCheck
                  style={{ width: "2rem", height: "2rem", color: "#4f46e5" }}
                />
              </div>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "700",
                  color: "#0f172a",
                  margin: "0 0 0.25rem 0",
                }}
              >
                No active work
              </h3>
              <p style={{ color: "#64748b" }}>
                Create a new assignment to get started.
              </p>
            </div>
          ) : (
            activeAssignments.map((assignment) => {
              const student = students.find(
                (s) => s.id === assignment.assignedTo
              );
              const isGrading = gradingId === assignment.id;
              const isSubmitted =
                assignment.status === AssignmentStatus.SUBMITTED;

              return (
                <div key={assignment.id} className="submission-card">
                  <div className="submission-summary">
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            padding: "0.125rem 0.5rem",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            borderRadius: "0.25rem",
                            textTransform: "uppercase",
                          }}
                        >
                          {assignment.subject}
                        </span>
                        <span
                          style={{ fontSize: "0.875rem", color: "#cbd5e1" }}
                        >
                          •
                        </span>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            color: "#64748b",
                          }}
                        >
                          {student?.name}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          Due:{" "}
                          {assignment.dueDate
                            ? new Date(assignment.dueDate).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: "700",
                          color: "#0f172a",
                          margin: 0,
                        }}
                      >
                        {assignment.title}
                      </h3>
                      <div style={{ marginTop: "0.5rem" }}>
                        {assignment.submittedFiles &&
                        assignment.submittedFiles.length > 0 ? (
                          <span
                            style={{ fontSize: "0.75rem", color: "#64748b" }}
                          >
                            {assignment.submittedFiles.length} answer file(s)
                            attached
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#ef4444",
                              fontStyle: "italic",
                            }}
                          >
                            Not submitted yet
                          </span>
                        )}
                      </div>
                      {assignment.questionPapers &&
                        assignment.questionPapers.length > 0 && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <p
                              style={{
                                fontSize: "0.75rem",
                                color: "#64748b",
                                fontWeight: "600",
                              }}
                            >
                              Question Papers:
                            </p>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.25rem",
                                marginTop: "0.25rem",
                              }}
                            >
                              {assignment.questionPapers.map((qp) => (
                                <button
                                  key={qp.id}
                                  onClick={() =>
                                    downloadBase64Data(qp.url, qp.name)
                                  }
                                  className="file-link-btn"
                                >
                                  <IconFile
                                    style={{
                                      width: "0.8rem",
                                      height: "0.8rem",
                                      color: "#4f46e5",
                                    }}
                                  />
                                  {qp.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    {!isGrading && (
                      <div
                        className="flex gap-2 items-center"
                        style={{
                          display: "flex",
                          gap: "2",
                          alignItems: "center",
                        }}
                      >
                        {isSubmitted ? (
                          <button
                            onClick={() => startGrading(assignment)}
                            className="btn-create"
                            style={{
                              padding: "0.625rem 1.5rem",
                              backgroundColor: "#4f46e5",
                            }}
                          >
                            Grade Submission
                          </button>
                        ) : (
                          <div
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#f1f5f9",
                              borderRadius: "0.75rem",
                              color: "#64748b",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                            }}
                          >
                            Waiting for Student
                          </div>
                        )}
                        <button
                          onClick={() => onDelete(assignment.id)}
                          className="action-icon-btn delete"
                          title="Delete Assignment"
                          style={{ border: "none", background: "transparent" }}
                        >
                          <IconTrash
                            style={{ width: "1.25rem", height: "1.25rem" }}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {isGrading && (
                    <div
                      style={{
                        padding: "0 1.5rem 1.5rem 1.5rem",
                        backgroundColor: "#f8fafc",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <div
                        className="grading-layout"
                        style={{ marginTop: "1.5rem" }}
                      >
                        <div className="grading-col">
                          <h4
                            style={{
                              marginBottom: "1rem",
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Student's Work
                          </h4>
                          {(!assignment.submittedFiles ||
                            assignment.submittedFiles.length === 0) && (
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "#64748b",
                                fontStyle: "italic",
                              }}
                            >
                              No files submitted.
                            </p>
                          )}
                          <div className="submission-files-grid">
                            {assignment.submittedFiles &&
                              assignment.submittedFiles.map((file) => (
                                <div key={file.id} className="submission-file">
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.75rem",
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: "2.5rem",
                                        width: "2.5rem",
                                        backgroundColor: "#fef2f2",
                                        borderRadius: "0.5rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#ef4444",
                                      }}
                                    >
                                      <IconFile
                                        style={{
                                          width: "1.25rem",
                                          height: "1.25rem",
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <p
                                        style={{
                                          fontSize: "0.875rem",
                                          fontWeight: "500",
                                          color: "#0f172a",
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          maxWidth: "10rem",
                                        }}
                                      >
                                        {file.name}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "#64748b",
                                        }}
                                      >
                                        {file.type || "Document"}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      downloadBase64Data(file.url, file.name)
                                    }
                                    className="icon-btn-rounded"
                                    title="Download File"
                                  >
                                    <IconDownload
                                      style={{
                                        width: "1.25rem",
                                        height: "1.25rem",
                                        color: "#94a3b8",
                                      }}
                                    />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div className="grading-col">
                          <h4
                            style={{
                              marginBottom: "1rem",
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Grading
                          </h4>
                          <div className="grading-input-group">
                            <label className="grading-label">
                              Score (out of {assignment.maxScore})
                            </label>
                            <input
                              type="number"
                              max={assignment.maxScore}
                              value={scoreInput}
                              onChange={(e) => setScoreInput(e.target.value)}
                              className="grading-input"
                              placeholder="0"
                            />
                          </div>
                          <div className="grading-input-group">
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <label className="grading-label">Remarks</label>
                              <button
                                type="button"
                                // onClick={() =>
                                //   handleGenerateRemarks(assignment)
                                // }
                                disabled={!scoreInput || isGeneratingAI}
                                className="ai-btn"
                              >
                                <IconSparkles
                                  style={{
                                    width: "0.875rem",
                                    height: "0.875rem",
                                  }}
                                />
                                {isGeneratingAI
                                  ? "Generating..."
                                  : "Auto-Generate"}
                              </button>
                            </div>
                            <textarea
                              value={remarksInput}
                              onChange={(e) => setRemarksInput(e.target.value)}
                              className="grading-textarea"
                              placeholder="Add comments for the student..."
                            />
                          </div>
                          <div className="form-actions">
                            <button
                              onClick={() => setGradingId(null)}
                              className="btn-secondary"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => submitGrade(assignment.id)}
                              className="btn-primary"
                              style={{
                                backgroundColor: "#059669",
                                boxShadow:
                                  "0 4px 6px -1px rgba(5, 150, 105, 0.2)",
                              }}
                            >
                              Submit Grade
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {isStudentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container md">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingStudent ? "Edit Student" : "Add New Student"}
              </h2>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="btn-close"
              >
                <IconX style={{ width: "1.5rem", height: "1.5rem" }} />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="modal-content">
              {/* Form fields same as previous */}
              <div className="form-field">
                <label className="grading-label">Full Name</label>
                <input
                  type="text"
                  className="grading-input"
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-field">
                <label className="grading-label">Email Address</label>
                <input
                  type="email"
                  className="grading-input"
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="grading-label">Class/Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. 10th"
                    className="grading-input"
                    value={studentForm.class}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, class: e.target.value })
                    }
                  />
                </div>
                <div className="form-field">
                  <label className="grading-label">Phone</label>
                  <input
                    type="tel"
                    className="grading-input"
                    value={studentForm.phone}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="grading-label">
                  {editingStudent ? "New Password (Optional)" : "Password"}
                </label>
                <input
                  type="password"
                  className="grading-input"
                  value={studentForm.password}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, password: e.target.value })
                  }
                  required={!editingStudent}
                  placeholder={
                    editingStudent ? "Leave empty to keep current" : ""
                  }
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingStudent ? "Save Changes" : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container lg">
            <div className="modal-header">
              <h2 className="modal-title">Create New Assignment</h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="btn-close"
              >
                <IconX style={{ width: "1.5rem", height: "1.5rem" }} />
              </button>
            </div>

            <div className="modal-content">
              <form onSubmit={handleAssignSubmit}>
                {/* Subject and Student Selection */}
                <div className="form-row">
                  <div className="form-field">
                    <label className="grading-label">Student</label>
                    <select
                      className="grading-input"
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.class})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="grading-label">Subject</label>
                    <select
                      className="grading-input"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      required
                    >
                      <option value="" disabled selected>
                        Select Subject
                      </option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label className="grading-label">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Calculus Integration Chapter 4"
                    className="grading-input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label className="grading-label">Deadline Date</label>
                    <input
                      type="date"
                      className="grading-input"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="grading-label">
                    Description / Instructions
                  </label>
                  <textarea
                    placeholder="Enter instructions for the student..."
                    className="grading-textarea"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="grading-label">
                    Question Papers (PDF/Images)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,.doc,.docx,.png,.jpg"
                    multiple // Allow multiple
                    onChange={handleFileSelect}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: "0.75rem",
                      padding: "1.5rem",
                      textAlign: "center",
                      backgroundColor: "#f8fafc",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      marginBottom: "1rem",
                    }}
                  >
                    <IconFile
                      style={{
                        width: "2rem",
                        height: "2rem",
                        color: "#94a3b8",
                        margin: "0 auto 0.5rem auto",
                      }}
                    />
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      Click to upload files (Multiple allowed)
                    </p>
                  </div>

                  {uploadedQPs.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {uploadedQPs.map((qp) => (
                        <div
                          key={qp.id}
                          style={{
                            padding: "0.75rem",
                            backgroundColor: "#f0f9ff",
                            borderRadius: "0.75rem",
                            border: "1px solid #bae6fd",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <IconFile
                              style={{
                                width: "1.25rem",
                                height: "1.25rem",
                                color: "#0ea5e9",
                              }}
                            />
                            <span
                              style={{
                                fontWeight: "500",
                                color: "#0284c7",
                                fontSize: "0.9rem",
                              }}
                            >
                              {qp.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQP(qp.id)}
                            className="btn-close"
                            style={{ color: "#ef4444" }}
                          >
                            <IconX
                              style={{ width: "1.25rem", height: "1.25rem" }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Send Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
