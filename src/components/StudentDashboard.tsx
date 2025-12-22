import React, { useState, useRef } from "react";
import { Assignment, AssignmentStatus, User } from "../types";
import {
  IconDownload,
  IconUpload,
  IconFile,
  IconTrash,
  IconProfile,
  IconPlus,
} from "./Icons";
import { downloadBase64Data } from "../utils";
import "./StudentDashboard.css";

interface StudentDashboardProps {
  user: User;
  assignments: Assignment[];
  onUpload: (assignmentId: string, files: FileList) => void;
  onDeleteFile: (assignmentId: string, fileId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  assignments,
  onUpload,
  onDeleteFile,
}) => {
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "PROFILE">(
    "DASHBOARD"
  );
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "SUBMITTED">("ALL");
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const filteredAssignments = assignments.filter((a) => {
    if (filter === "ALL") return true;
    if (filter === "PENDING") return a.status === AssignmentStatus.PENDING;
    if (filter === "SUBMITTED") return a.status !== AssignmentStatus.PENDING;
    return true;
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    assignmentId: string
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(assignmentId, e.target.files);
      e.target.value = "";
    }
  };

  const triggerFileInput = (id: string) => {
    fileInputRefs.current[id]?.click();
  };

  const getStatusClass = (status: AssignmentStatus) => {
    switch (status) {
      case AssignmentStatus.GRADED:
        return "status-badge graded";
      case AssignmentStatus.SUBMITTED:
        return "status-badge submitted";
      default:
        return "status-badge pending";
    }
  };

  const getIndicatorClass = (status: AssignmentStatus) => {
    switch (status) {
      case AssignmentStatus.GRADED:
        return "status-indicator graded";
      case AssignmentStatus.SUBMITTED:
        return "status-indicator submitted";
      default:
        return "status-indicator pending";
    }
  };

  const UserProfile = () => {
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(
      (a) => a.status !== AssignmentStatus.PENDING
    ).length;
    const gradedAssignments = assignments
      .filter((a) => a.status === AssignmentStatus.GRADED)
      .sort(
        (a, b) =>
          new Date(b.submittedAt || 0).getTime() -
          new Date(a.submittedAt || 0).getTime()
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

    return (
      <div className="profile-wrapper">
        <div className="profile-header-card">
          <div className="profile-cover"></div>
          <div className="profile-info">
            <div className="profile-avatar-container">
              <div className="profile-avatar">{user.name.charAt(0)}</div>
            </div>
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-role">{user.class} Student</p>
            <div className="profile-badges">
              <span className="info-badge">{user.email}</span>
              <span className="info-badge">ID: #{user.id.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="profile-content-grid">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div className="info-card">
              <h3 className="card-heading">Personal Information</h3>
              <div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-val">
                    {user.phone || "+1 (555) 000-0000"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="info-val">
                    {user.address || "123 Education Lane"}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Joined</span>
                  <span className="info-val">
                    {user.joinDate || "Sep 2023"}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3 className="card-heading">Graded Assignments History</h3>
              {gradedAssignments.length > 0 ? (
                <div>
                  {gradedAssignments.map((assign) => (
                    <div key={assign.id} className="history-item">
                      <div className="history-main">
                        <h4>{assign.title}</h4>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            margin: "0.25rem 0",
                          }}
                        >
                          {assign.subject}
                        </p>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontStyle: "italic",
                            color: "#334155",
                          }}
                        >
                          "{assign.remarks}"
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: "1.25rem",
                            fontWeight: "800",
                            color: "#059669",
                          }}
                        >
                          {assign.score}/{assign.maxScore}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#059669",
                            fontWeight: "600",
                          }}
                        >
                          Score
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No graded assignments yet.</p>
              )}
            </div>
          </div>

          <div className="info-card" style={{ height: "fit-content" }}>
            <h3 className="card-heading">Performance</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div className="stat-bar-container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span className="info-label">Assignments Completed</span>
                  <span className="info-val">
                    {completedAssignments}/{totalAssignments}
                  </span>
                </div>
                <div className="stat-bar-bg">
                  <div
                    className="stat-bar-fill"
                    style={{
                      backgroundColor: "#4f46e5",
                      width: `${
                        totalAssignments > 0
                          ? (completedAssignments / totalAssignments) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="stat-bar-container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span className="info-label">Average Score</span>
                  <span className="info-val" style={{ color: "#059669" }}>
                    {avgScore}%
                  </span>
                </div>
                <div className="stat-bar-bg">
                  <div
                    className="stat-bar-fill"
                    style={{
                      backgroundColor: "#10b981",
                      width: `${avgScore}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#e0e7ff",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "1.5rem",
                    fontWeight: "800",
                    color: "#4338ca",
                  }}
                >
                  {gradedAssignments.length}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    color: "#4338ca",
                  }}
                >
                  Graded Tasks
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="student-dashboard">
      <div className="tabs-nav">
        <button
          onClick={() => setActiveTab("DASHBOARD")}
          className={`tab-link ${activeTab === "DASHBOARD" ? "active" : ""}`}
        >
          <IconFile style={{ width: "1rem", height: "1rem" }} />
          Assignments
        </button>
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`tab-link ${activeTab === "PROFILE" ? "active" : ""}`}
        >
          <IconProfile style={{ width: "1rem", height: "1rem" }} />
          My Profile
        </button>
      </div>

      {activeTab === "PROFILE" && <UserProfile />}

      {activeTab === "DASHBOARD" && (
        <div
          className="animate-fade-in"
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div className="filter-bar">
            {["ALL", "PENDING", "SUBMITTED"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`filter-btn ${filter === f ? "active" : ""}`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="assignments-grid">
            {filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="assignment-card">
                <div className={getIndicatorClass(assignment.status)} />
                <div className="card-padding">
                  <div className="card-top">
                    <span className="subject-tag">{assignment.subject}</span>
                    <span className={getStatusClass(assignment.status)}>
                      {assignment.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="card-title">{assignment.title}</h3>
                    <p className="card-description">{assignment.description}</p>
                    {assignment.dueDate && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "#ef4444",
                          marginTop: "0.5rem",
                          fontWeight: 600,
                        }}
                      >
                        Deadline:{" "}
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="card-actions">
                    {/* Multiple QP Download Section */}
                    {assignment.questionPapers &&
                    assignment.questionPapers.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#64748b",
                            textTransform: "uppercase",
                          }}
                        >
                          Question Papers
                        </p>
                        {assignment.questionPapers.map((qp) => (
                          <button
                            key={qp.id}
                            onClick={() => downloadBase64Data(qp.url, qp.name)}
                            className="btn-action btn-download border-none cursor-pointer w-full text-left"
                          >
                            <IconDownload
                              style={{ width: "1rem", height: "1rem" }}
                            />
                            {qp.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        className="btn-action btn-download"
                        disabled
                        style={{ opacity: 0.5, cursor: "not-allowed" }}
                      >
                        <IconDownload
                          style={{ width: "1rem", height: "1rem" }}
                        />
                        No QP Available
                      </button>
                    )}

                    <div className="work-section">
                      <p className="section-label">My Answer Scripts</p>

                      {assignment.submittedFiles &&
                        assignment.submittedFiles.length > 0 && (
                          <div className="file-list">
                            {assignment.submittedFiles.map((file) => (
                              <div key={file.id} className="file-item">
                                <button
                                  onClick={() =>
                                    downloadBase64Data(file.url, file.name)
                                  }
                                  className="file-link border-none bg-transparent cursor-pointer"
                                >
                                  <IconFile
                                    style={{
                                      color: "#4f46e5",
                                      flexShrink: 0,
                                      width: "1rem",
                                      height: "1rem",
                                    }}
                                  />
                                  <span className="file-name">{file.name}</span>
                                </button>
                                {assignment.status !==
                                  AssignmentStatus.GRADED && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      onDeleteFile(assignment.id, file.id);
                                    }}
                                    className="btn-delete"
                                    title="Remove file"
                                  >
                                    <IconTrash
                                      style={{
                                        width: "0.875rem",
                                        height: "0.875rem",
                                      }}
                                    />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                      {assignment.status === AssignmentStatus.GRADED ? (
                        <div className="graded-feedback">
                          <div className="feedback-row">
                            <span className="grade-label">Graded</span>
                            <span className="grade-score">
                              {assignment.score}/{assignment.maxScore}
                            </span>
                          </div>
                          <p className="grade-remarks">
                            "{assignment.remarks}"
                          </p>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            multiple
                            ref={(el) => {
                              fileInputRefs.current[assignment.id] = el;
                            }}
                            style={{ display: "none" }}
                            accept=".pdf,.doc,.docx,.jpg,.png"
                            onChange={(e) => handleFileChange(e, assignment.id)}
                          />
                          <button
                            onClick={() => triggerFileInput(assignment.id)}
                            className="btn-action btn-upload"
                            style={{ width: "100%" }}
                          >
                            {assignment.submittedFiles &&
                            assignment.submittedFiles.length > 0 ? (
                              <IconPlus
                                style={{ width: "1rem", height: "1rem" }}
                              />
                            ) : (
                              <IconUpload
                                style={{ width: "1rem", height: "1rem" }}
                              />
                            )}
                            {assignment.submittedFiles &&
                            assignment.submittedFiles.length > 0
                              ? "Add Another File"
                              : "Upload Answer Script"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAssignments.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon-circle">
                <IconFile style={{ width: "2rem", height: "2rem" }} />
              </div>
              <p>No assignments found in this category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
