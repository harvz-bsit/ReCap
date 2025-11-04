// --- MOCK DATA ---
export interface TeamMember {
  name: string;
  role?: string;
  department?: string;
}

export interface TeamTask {
  id: string;
  title: string;
  status: "Pending" | "In Progress" | "Completed";
  deadline: string; // YYYY-MM-DD
  assignedTo?: string
}

export interface TeamMeeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  tasks: TeamTask[];
  meetings: TeamMeeting[];
}

export const teams: Team[] = [
  {
    id: "team1",
    name: "Project Alpha",
    members: [
      { name: "Alyssa Quinones", role: "Developer", department: "IT" },
      { name: "Carlos Cruz", role: "Project Manager", department: "IT" },
      { name: "Emma Diaz", role: "Designer", department: "UI/UX" },
      { name: "Mark Reyes", role: "QA Tester", department: "QA" },
    ],

    tasks: [
  { id: "task1", title: "Setup project repo", status: "Completed", deadline: "2025-11-01", assignedTo: "Alyssa Quinones" },
  { id: "task2", title: "Create wireframes", status: "In Progress", deadline: "2025-11-03", assignedTo: "Emma Diaz" },
  { id: "task3", title: "Implement login screen", status: "Pending", deadline: "2025-11-05", assignedTo: "Alyssa Quinones" },
  { id: "task4", title: "Test user authentication", status: "Pending", deadline: "2025-11-06", assignedTo: "Mark Reyes" },
],

    meetings: [
      { id: "meet1", title: "Sprint Planning", date: "2025-11-01", time: "09:00" },
      { id: "meet2", title: "Design Review", date: "2025-11-02", time: "14:00" },
      { id: "meet3", title: "Client Feedback", date: "2025-11-03", time: "11:00" },
    ],
  },
  {
    id: "team2",
    name: "Project Beta",
    members: [
      { name: "John Doe", role: "Developer", department: "IT" },
      { name: "Jane Smith", role: "Designer", department: "UI/UX" },
    ],
    tasks: [
      { id: "task1", title: "API Integration", status: "In Progress", deadline: "2025-11-04" },
      { id: "task2", title: "UI Polish", status: "Pending", deadline: "2025-11-05" },
    ],
    meetings: [
      { id: "meet1", title: "Kickoff Meeting", date: "2025-11-01", time: "10:00" },
    ],
  },
];
