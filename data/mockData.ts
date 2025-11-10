// data/mockData.ts

export interface TeamMember {
  name: string;
  role?: string;
  department?: string;
}

export interface TeamTask {
  id: string;
  title: string;
  status: "Pending" | "In Progress" | "Completed";
  deadline: string;
  assignedTo?: string; // ✅ left empty — to be assigned in Firebase
}

export interface TeamMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
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
    members: [], // ✅ firebase only
    tasks: [
      { id: "task1", title: "Setup project repo", status: "Completed", deadline: "2025-11-01" },
      { id: "task2", title: "Create wireframes", status: "In Progress", deadline: "2025-11-03" },
      { id: "task3", title: "Implement login screen", status: "Pending", deadline: "2025-11-05" },
      { id: "task4", title: "Test user authentication", status: "Pending", deadline: "2025-11-06" },
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
    members: [],
    tasks: [
      { id: "task1", title: "API Integration", status: "In Progress", deadline: "2025-11-04" },
      { id: "task2", title: "UI Polish", status: "Pending", deadline: "2025-11-05" },
    ],
    meetings: [
      { id: "meet1", title: "Kickoff Meeting", date: "2025-11-01", time: "10:00" },
    ],
  },
];
