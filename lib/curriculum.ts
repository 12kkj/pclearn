// ============================================================
// Computer Skills Academy - 210-Day Complete Curriculum
// Zero-knowledge PC/laptop users -> Class 12 pass, college-bound students
// Foundations + practical skills first, then a Mastery Track deep-dive
// into DSA / Cybersecurity / Data Science & AI / Cloud-DevOps at the end.
// ============================================================
import type { LessonMeta, Phase } from "@/types";

export const PHASES: Phase[] = [
  {
    id: 0,
    name: "PC & Android Foundations",
    icon: "📱",
    color: "teal",
    days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    milestoneProject: "Create a personal device guide comparing your phone, laptop, and desktop setup with smart settings and safety habits",
  },
  {
    id: 1,
    name: "PC Fundamentals & Windows Basics",
    icon: "💻",
    color: "blue",
    days: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    milestoneProject: "Set up a fully-updated, backed-up Windows PC and write a one-page 'how my computer works' explainer",
  },
  {
    id: 2,
    name: "Productivity & Office Suite",
    icon: "📊",
    color: "purple",
    days: [21, 22, 23, 24, 25, 26, 27, 28, 29],
    milestoneProject: "Create a complete report with Word, Excel charts, and a PowerPoint presentation",
  },
  {
    id: 3,
    name: "Hardware, PC Building & Repair",
    icon: "🔧",
    color: "orange",
    days: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
    milestoneProject: "Design a PC build, then diagnose and fix 3 common hardware/laptop problems",
  },
  {
    id: 4,
    name: "OS, CMD, Terminal & Networking",
    icon: "⌨️",
    color: "green",
    days: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
    milestoneProject: "Write a shell script that automates a real task, using CMD, PowerShell and Linux commands",
  },
  {
    id: 5,
    name: "Programming Logic & Git",
    icon: "🔀",
    color: "teal",
    days: [53, 54, 55, 56, 57, 58, 59],
    milestoneProject: "Create a GitHub repository with a well-documented mini project",
  },
  {
    id: 6,
    name: "Python Programming",
    icon: "🐍",
    color: "yellow",
    days: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73],
    milestoneProject: "Build a command-line To-Do app with file persistence in Python",
  },
  {
    id: 7,
    name: "C Programming",
    icon: "🔤",
    color: "red",
    days: [74, 75, 76, 77, 78],
    milestoneProject: "Write a small C program that uses pointers and file I/O together",
  },
  {
    id: 8,
    name: "C++ Programming",
    icon: "⚙️",
    color: "rose",
    days: [79, 80, 81, 82, 83, 84, 85, 86],
    milestoneProject: "Implement a small library-management console app in modern C++ using STL",
  },
  {
    id: 9,
    name: "Java Programming",
    icon: "☕",
    color: "amber",
    days: [87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98],
    milestoneProject: "Build a Java console app with collections, exception handling and a Gradle build",
  },
  {
    id: 10,
    name: "Web Development Foundations",
    icon: "🌐",
    color: "indigo",
    days: [99, 100, 101, 102, 103, 104, 105],
    milestoneProject: "Build a personal portfolio website with HTML, CSS & JavaScript",
  },
  {
    id: 11,
    name: "Advanced Web & Frameworks",
    icon: "🚀",
    color: "sky",
    days: [106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117],
    milestoneProject: "Build a full-stack web app with React + Next.js + Node.js",
  },
  {
    id: 12,
    name: "Databases & Backend",
    icon: "🗄️",
    color: "cyan",
    days: [118, 119, 120, 121, 122, 123, 124],
    milestoneProject: "Build a REST API with Node.js + Express + a SQL database",
  },
  {
    id: 13,
    name: "Mobile & Cross-Platform",
    icon: "📱",
    color: "emerald",
    days: [125, 126, 127, 128, 129, 130, 131, 132, 133, 134],
    milestoneProject: "Build a cross-platform mobile app with Flutter or React Native",
  },
  {
    id: 14,
    name: "AI & Machine Learning Basics",
    icon: "🤖",
    color: "pink",
    days: [135, 136, 137, 138, 139, 140, 141],
    milestoneProject: "Build a simple AI chatbot using a real LLM API",
  },
  {
    id: 15,
    name: "Data Science Basics",
    icon: "📈",
    color: "lime",
    days: [142, 143, 144, 145],
    milestoneProject: "Analyze a real dataset with Pandas and present 3 charts",
  },
  {
    id: 16,
    name: "Cloud & DevOps Basics",
    icon: "☁️",
    color: "slate",
    days: [146, 147, 148, 149, 150, 151],
    milestoneProject: "Deploy a live web app to the cloud with a working CI pipeline",
  },
  {
    id: 17,
    name: "Cybersecurity Basics",
    icon: "🔒",
    color: "fuchsia",
    days: [152, 153, 154, 155, 156],
    milestoneProject: "Write a personal digital-safety checklist and audit your own accounts/devices",
  },
  {
    id: 18,
    name: "Mastery Track: Data Structures & Algorithms",
    icon: "🧩",
    color: "violet",
    days: [157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168],
    milestoneProject: "Solve a themed set of 10 interview-style DSA problems end-to-end",
  },
  {
    id: 19,
    name: "Mastery Track: Cybersecurity & Ethical Hacking",
    icon: "🛡️",
    color: "red",
    days: [169, 170, 171, 172, 173, 174, 175, 176],
    milestoneProject: "Perform a guided penetration test on a practice target and write a security report",
  },
  {
    id: 20,
    name: "Mastery Track: Data Science & Advanced AI",
    icon: "🧠",
    color: "purple",
    days: [177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188],
    milestoneProject: "Train a model and build a RAG chatbot, then present the results",
  },
  {
    id: 21,
    name: "Mastery Track: DevOps, Cloud & System Design",
    icon: "🏗️",
    color: "blue",
    days: [189, 190, 191, 192, 193, 194, 195, 196, 197, 198],
    milestoneProject: "Design and deploy a small system with Docker, CI/CD and basic system-design tradeoffs",
  },
  {
    id: 22,
    name: "Career Prep & Grand Capstone",
    icon: "🎓",
    color: "orange",
    days: [199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210],
    milestoneProject: "Grand Capstone: build, deploy and present a full-stack AI-powered application, plus a job-ready portfolio",
  },
];

export const CURRICULUM: LessonMeta[] = [
  {
    day: 1,
    title: "Device Basics: Computer, Laptop, Tablet & Smartphone",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 40,
    topics: ["devices", "computer", "laptop", "tablet", "smartphone", "digital literacy"],
    learningObjectives: ["Identify the main types of personal devices", "Understand the purpose of a computer, laptop, tablet, and phone", "Recognize basic everyday device tasks"],
  },
  {
    day: 2,
    title: "Operating Systems Overview: Windows vs macOS vs Linux",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["Windows", "macOS", "Linux", "operating system", "desktop", "comparison"],
    learningObjectives: ["Know what an operating system does", "Compare main desktop operating systems", "Understand where you see the OS in daily use"],
  },
  {
    day: 3,
    title: "Mobile Operating Systems: Android vs iOS",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 40,
    topics: ["Android", "iOS", "mobile OS", "app store", "ecosystem", "settings"],
    learningObjectives: ["Recognize the difference between Android and iOS", "Understand how mobile apps are organized", "Navigate the most common mobile settings"],
  },
  {
    day: 4,
    title: "UI vs UX: What Good Design Actually Means",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 35,
    topics: ["UI", "UX", "design", "usability", "user experience", "interface"],
    learningObjectives: ["Understand the difference between UI and UX", "Recognize simple good design examples", "Know why ease of use matters"],
  },
  {
    day: 5,
    title: "PC vs Laptop: Hardware, Software, Power & Portability",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["PC vs laptop", "hardware", "software", "battery", "power", "portability", "performance"],
    learningObjectives: ["Compare desktop PCs and laptops", "Understand hardware and software differences", "Know why battery life and portability matter"],
  },
  {
    day: 6,
    title: "Android Basics: Settings, Apps, Developer Options & Notifications",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 40,
    topics: ["Android", "settings", "apps", "notifications", "permissions", "developer options", "home screen"],
    learningObjectives: ["Open and use Android settings", "Manage apps and notifications", "Understand the purpose of app permissions", "Recognize what developer options are for"],
  },
  {
    day: 7,
    title: "Digital Safety: Permissions, Privacy & Scam Awareness",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 40,
    topics: ["privacy", "permissions", "scams", "security", "app access", "malware"],
    learningObjectives: ["Recognize common app permission requests", "Identify simple scam signs", "Use safe habits while browsing and installing apps"],
  },
  {
    day: 8,
    title: "Cloud Storage, Backup & File Sync Basics",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 35,
    topics: ["cloud storage", "backup", "OneDrive", "Google Drive", "Dropbox", "sync"],
    learningObjectives: ["Understand why backup matters", "Use cloud storage in a simple way", "Know the difference between saving and syncing"],
  },
  {
    day: 9,
    title: "Smart Device Setup: Browser, Apps & Productivity Tools",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 40,
    topics: ["browser", "productivity apps", "extensions", "password manager", "notifications"],
    learningObjectives: ["Set up a simple browser and app workflow", "Use productivity tools for everyday tasks", "Keep your digital workspace organized"],
  },
  {
    day: 10,
    title: "Phase 0 Revision & Digital Literacy Milestone",
    phase: 0,
    difficulty: "beginner",
    estimatedMinutes: 60,
    topics: ["revision", "digital literacy", "devices", "UI/UX", "privacy", "PC vs laptop"],
    learningObjectives: ["Review the basics of devices and software", "Explain the difference between PC and Android usage", "Practice safe and organized digital habits"],
    isRevisionDay: true,
    isMilestone: true,
  },
  // ══════════════════════════════════════════════════════════════════════
  // PHASE 1: PC Fundamentals & Windows Basics
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 11,
    title: "What Is a Computer? Hardware vs Software Explained Simply",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 40,
    topics: ["computer basics", "hardware", "software", "input devices", "output devices", "how a PC turns on"],
    learningObjectives: ["Identify basic PC hardware parts", "Understand the difference between hardware and software", "Recognize how a computer starts up"],
  },
  {
    day: 12,
    title: "Windows Desktop Deep Dive: Taskbar, Start Menu & Settings",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["operating system", "Windows", "desktop", "taskbar", "start menu", "settings app", "control panel", "task manager"],
    learningObjectives: ["Navigate the Windows desktop confidently", "Use the Start Menu and Settings app", "Understand common system tools"],
  },
  {
    day: 13,
    title: "File Management Mastery: Paths, Extensions & Organization",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["file management", "folders", "file extensions", "paths", "copy/paste", "search", "File Explorer"],
    learningObjectives: ["Create and organize files and folders", "Understand common file extensions", "Use File Explorer effectively"],
  },
  {
    day: 14,
    title: "Ultimate Windows Shortcuts & Productivity Speed Tips",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 40,
    topics: ["keyboard shortcuts", "clipboard", "virtual desktops", "snap layouts", "quick access"],
    learningObjectives: ["Use basic Windows shortcuts", "Work faster with snap and desktop features", "Improve daily productivity on a PC"],
  },
  {
    day: 15,
    title: "Windows Updates, Drivers & Keeping Your PC Healthy",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["Windows Update", "drivers", "device manager", "update settings", "why updates matter", "rolling back updates"],
    learningObjectives: ["Understand why updates matter", "Know when to update drivers", "Keep a PC healthy and secure"],
  },
  {
    day: 16,
    title: "PC & Laptop Care: Cleaning, Battery Health & Overheating Prevention",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["laptop care", "PC maintenance", "battery health", "overheating", "dust cleaning", "safe handling", "storage tips"],
    learningObjectives: ["Care for a laptop and desktop safely", "Recognize overheating and battery issues", "Follow basic maintenance habits"],
  },
  {
    day: 17,
    title: "Basic Troubleshooting: Safe Mode, Backup, Restore & Factory Reset",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["troubleshooting", "safe mode", "system restore", "backup", "factory reset", "recovery drive", "when to reinstall Windows"],
    learningObjectives: ["Use simple troubleshooting steps", "Create basic backups", "Understand when reset or restore is needed"],
  },
  {
    day: 18,
    title: "History of Computing & How Computers 'Think' (Binary Teaser)",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 35,
    topics: ["history of computing", "generations of computers", "Moore's law", "transistors", "binary intro"],
    learningObjectives: ["Understand the basic story of computing", "See how computers evolved", "Get a gentle introduction to binary"],
  },
  {
    day: 19,
    title: "Binary & Number Systems: The Language of Machines",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 55,
    topics: ["binary", "decimal", "hexadecimal", "octal", "number conversion", "bits and bytes"],
    learningObjectives: ["Read basic binary values", "Understand bits and bytes", "Convert simple numbers between bases"],
  },
  {
    day: 20,
    title: "Phase 1 Grand Revision & Computer Basics Quiz",
    phase: 1,
    difficulty: "beginner",
    estimatedMinutes: 60,
    topics: ["revision", "hardware", "software", "binary", "Windows", "file management", "PC care", "troubleshooting"],
    learningObjectives: ["Review PC basics in order", "Reconnect the key concepts from the phase", "Prepare for the next learning stage"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 2: Productivity & Office Suite
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 21,
    title: "Internet Fundamentals: Browsers, URLs & Safe Searching",
    phase: 2,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["internet", "browsers", "URL", "HTTP", "HTTPS", "search engines", "bookmarks"],
  },
  {
    day: 22,
    title: "Cyber Safety, Passwords & Your Digital Safety Basics",
    phase: 2,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["cyber safety", "passwords", "2FA", "phishing", "VPN", "antivirus", "privacy"],
  },
  {
    day: 23,
    title: "Email Mastery: Gmail, Outlook & Professional Communication",
    phase: 2,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["email", "Gmail", "Outlook", "CC/BCC", "professional writing", "email etiquette"],
  },
  {
    day: 24,
    title: "Microsoft Word & Google Docs: Document Mastery",
    phase: 2,
    difficulty: "beginner",
    estimatedMinutes: 60,
    topics: ["MS Word", "Google Docs", "formatting", "styles", "headers", "tables", "mail merge"],
  },
  {
    day: 25,
    title: "Microsoft Excel & Google Sheets: Spreadsheet Fundamentals",
    phase: 2,
    difficulty: "beginner",
    estimatedMinutes: 60,
    topics: ["Excel", "Google Sheets", "cells", "rows", "columns", "basic formulas", "sorting"],
  },
  {
    day: 26,
    title: "Excel Power User: Formulas, Functions & Data Analysis",
    phase: 2,
    difficulty: "intermediate",
    estimatedMinutes: 75,
    topics: ["VLOOKUP", "IF", "SUMIF", "pivot tables", "charts", "conditional formatting", "data validation"],
  },
  {
    day: 27,
    title: "PowerPoint & Canva: Presentation Design That Wows",
    phase: 2,
    difficulty: "beginner",
    estimatedMinutes: 60,
    topics: ["PowerPoint", "Canva", "slide design", "animations", "transitions", "design principles"],
  },
  {
    day: 28,
    title: "Google Workspace & Cloud Collaboration Tools",
    phase: 2,
    difficulty: "beginner",
    estimatedMinutes: 45,
    topics: ["Google Workspace", "Drive", "real-time collaboration", "sharing", "OneDrive", "Notion"],
  },
  {
    day: 29,
    title: "Phase 2 Revision & Office Productivity Milestone",
    phase: 2,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["revision", "Word", "Excel", "PowerPoint", "email", "Google Workspace"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 3: Hardware, PC Building & Repair
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 30,
    title: "The CPU: Architecture, Cores, Threads & Performance",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["CPU", "cores", "threads", "clock speed", "cache", "Intel vs AMD", "architecture"],
  },
  {
    day: 31,
    title: "GPU, RAM & Virtual Memory: The Speed Layer",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["GPU", "RAM", "DDR5", "VRAM", "virtual memory", "swap", "integrated graphics"],
  },
  {
    day: 32,
    title: "Storage Deep Dive: HDD, SATA SSD, NVMe & M.2",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["HDD", "SSD", "NVMe", "M.2", "SATA", "storage speeds", "file systems", "partitioning"],
  },
  {
    day: 33,
    title: "Motherboard, BIOS/UEFI, PSU & Power Delivery",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["motherboard", "chipset", "BIOS", "UEFI", "PSU", "SMPS", "power connectors", "POST"],
  },
  {
    day: 34,
    title: "Cooling Systems: Thermal Paste, Fans, AIOs & Form Factors",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 50,
    topics: ["cooling", "thermal paste", "CPU cooler", "AIO", "airflow", "ATX", "Mini-ITX", "TDP"],
  },
  {
    day: 35,
    title: "Laptop Internals: Mobile Computing & Repairability",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 50,
    topics: ["laptop", "mobile CPU", "battery", "display types", "RAM upgrade", "SSD upgrade", "repairability"],
  },
  {
    day: 36,
    title: "PC Building: Component Selection, Assembly & Testing",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["PC build", "compatibility", "PCIe", "cable management", "POST test", "driver installation"],
  },
  {
    day: 37,
    title: "Common Hardware Problems & Desktop Repair Basics",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["no boot", "beep codes", "blue screen", "hardware diagnosis", "reseating components", "DIY vs professional repair"],
  },
  {
    day: 38,
    title: "Laptop Repair & Care: Battery, Screen, Keyboard & Cleaning",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["laptop repair", "battery replacement", "screen issues", "keyboard issues", "reapplying thermal paste", "fan cleaning", "spare parts sourcing"],
  },
  {
    day: 39,
    title: "Phase 3 Revision & Hardware Troubleshooting Milestone",
    phase: 3,
    difficulty: "intermediate",
    estimatedMinutes: 75,
    topics: ["revision", "troubleshooting", "beep codes", "blue screen", "diagnostics", "hardware testing", "laptop care"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 4: OS, CMD, Terminal & Networking
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 40,
    title: "Windows CMD Basics: dir, cd, copy, move, del & mkdir",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["CMD", "dir", "cd", "copy", "move", "del", "mkdir", "rmdir", "cls", "exit"],
  },
  {
    day: 41,
    title: "CMD Intermediate: ipconfig, ping, tasklist & Environment Variables",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["ipconfig", "ping", "tasklist", "taskkill", "systeminfo", "environment variables", "PATH"],
  },
  {
    day: 42,
    title: "PowerShell Basics: Get-Process, Get-Service & Get-ChildItem",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["PowerShell", "Get-Help", "Get-Process", "Get-Service", "Get-ChildItem", "Set-Location", "cmdlets"],
  },
  {
    day: 43,
    title: "PowerShell Intermediate: Pipelines, Objects & Scripts",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["PowerShell pipeline", "objects", ".ps1 scripts", "execution policy", "modules", "variables"],
  },
  {
    day: 44,
    title: "Windows Terminal, winget & Package Managers",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 50,
    topics: ["Windows Terminal", "winget", "chocolatey", "scoop", "profiles", "fonts", "themes"],
  },
  {
    day: 45,
    title: "Linux Introduction: Why Linux, Distributions & WSL2",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["Linux", "distributions", "Ubuntu", "kernel", "open source", "WSL2", "dual boot"],
  },
  {
    day: 46,
    title: "Linux File System: ls, cd, mkdir, cp, mv, rm & man",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["Linux filesystem", "ls", "cd", "pwd", "mkdir", "touch", "cp", "mv", "rm", "cat", "man", "bash"],
  },
  {
    day: 47,
    title: "Linux Permissions, Users, Groups & sudo",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["chmod", "chown", "users", "groups", "sudo", "root", "file permissions", "umask"],
  },
  {
    day: 48,
    title: "Linux Text Processing: grep, sed, awk & Pipes",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["grep", "sed", "awk", "cut", "sort", "wc", "pipes", "redirects", "text processing"],
  },
  {
    day: 49,
    title: "Shell Scripting: Automation with Bash",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 75,
    topics: ["bash scripts", "variables", "loops", "conditionals", "functions", "cron jobs", "automation"],
  },
  {
    day: 50,
    title: "Networking Basics: IP Addresses, DNS, Ports & Wi-Fi Troubleshooting",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["IP address", "DNS", "HTTP", "HTTPS", "ports", "router", "Wi-Fi troubleshooting", "subnetting basics"],
  },
  {
    day: 51,
    title: "How Operating Systems Really Work: Process, Memory & Scheduling (Awareness)",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["process vs thread", "scheduling basics", "memory management overview", "why OS theory matters", "where it's used"],
  },
  {
    day: 52,
    title: "Phase 4 Revision & The Great Terminal Exam",
    phase: 4,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["CMD", "PowerShell", "Linux", "bash", "networking", "permissions", "scripting"],
    isRevisionDay: true,
    isMonthlyTest: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 5: Programming Logic & Git
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 53,
    title: "Logic Building: What Is an Algorithm, and Why Does It Matter?",
    phase: 5,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["algorithms basics", "problem solving", "what is an algorithm", "why algorithms matter", "pseudocode intro"],
  },
  {
    day: 54,
    title: "Flowcharts, Pseudocode & Thinking Like a Programmer",
    phase: 5,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["flowcharts", "pseudocode", "step-by-step thinking", "design patterns intro", "DRY"],
  },
  {
    day: 55,
    title: "Data Structures 101: What They Are, Why & Where They're Used",
    phase: 5,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["what is a data structure", "arrays overview", "lists overview", "stacks overview", "queues overview", "real-life analogies"],
  },
  {
    day: 56,
    title: "Searching & Sorting: The Big Idea (Concept-Level Overview)",
    phase: 5,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["linear search concept", "binary search concept", "sorting concept", "what is Big-O", "why efficiency matters"],
  },
  {
    day: 57,
    title: "Git Version Control: Commits, Branches & Time Travel",
    phase: 5,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["git", "init", "commit", "branch", "merge", "rebase", "stash", ".gitignore", "diff"],
  },
  {
    day: 58,
    title: "GitHub: Remotes, Pull Requests & Open Source Contribution",
    phase: 5,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["GitHub", "remote", "push", "pull", "fork", "PR", "issues", "GitHub Actions basics", "README"],
  },
  {
    day: 59,
    title: "Phase 5 Revision & Logic + Git Milestone",
    phase: 5,
    difficulty: "intermediate",
    estimatedMinutes: 75,
    topics: ["algorithms", "data structures overview", "flowcharts", "git", "GitHub"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 6: Python Programming
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 60,
    title: "Python Setup: Installation, VS Code & Your First Program",
    phase: 6,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["Python", "installation", "VS Code", "REPL", "print", "comments", "indentation"],
  },
  {
    day: 61,
    title: "Python Variables, Data Types & Type Conversion",
    phase: 6,
    difficulty: "beginner",
    estimatedMinutes: 55,
    topics: ["variables", "int", "float", "str", "bool", "type()", "input()", "type conversion"],
  },
  {
    day: 62,
    title: "Python Control Flow: if, elif, else & Comparison Operators",
    phase: 6,
    difficulty: "beginner",
    estimatedMinutes: 55,
    topics: ["if", "elif", "else", "comparison operators", "logical operators", "truthy/falsy", "ternary"],
  },
  {
    day: 63,
    title: "Python Loops: for, while, break, continue & List Comprehensions",
    phase: 6,
    difficulty: "beginner",
    estimatedMinutes: 60,
    topics: ["for loop", "while loop", "range()", "break", "continue", "enumerate()", "list comprehension"],
  },
  {
    day: 64,
    title: "Python Functions: Definitions, Arguments, Scope & Lambda",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["functions", "def", "parameters", "return", "scope", "lambda", "*args", "**kwargs", "closures"],
  },
  {
    day: 65,
    title: "Python Collections: Lists, Tuples, Sets & Dictionaries",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["list", "tuple", "set", "dict", "methods", "slicing", "unpacking", "comprehensions"],
  },
  {
    day: 66,
    title: "Python Strings: Manipulation, Formatting & Regular Expressions",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["strings", "string methods", "f-strings", "format()", "regex", "re module", "split/join"],
  },
  {
    day: 67,
    title: "Monthly Test 2 & Python Basics Milestone! 🎉",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["all topics", "Python fundamentals", "comprehensive assessment"],
    isMonthlyTest: true,
    isMilestone: true,
  },
  {
    day: 68,
    title: "Python File I/O, JSON & Error Handling with try/except",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["file I/O", "open()", "read/write", "JSON", "try/except", "exceptions", "finally"],
  },
  {
    day: 69,
    title: "Object-Oriented Python: Classes, Objects, Inheritance & Polymorphism",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 80,
    topics: ["OOP", "class", "object", "__init__", "self", "inheritance", "polymorphism", "encapsulation"],
  },
  {
    day: 70,
    title: "Python Modules: pip, Virtual Environments & Popular Libraries",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["modules", "import", "pip", "venv", "requests", "datetime", "math", "os", "sys"],
  },
  {
    day: 71,
    title: "Python Projects: Build a Calculator, To-Do App & Number Guesser",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["project", "calculator", "to-do app", "file storage", "user interface", "error handling"],
  },
  {
    day: 72,
    title: "Python for Data: A First Look at NumPy, Pandas & Matplotlib",
    phase: 6,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["NumPy", "Pandas", "Matplotlib", "arrays", "DataFrames", "visualization", "CSV"],
  },
  {
    day: 73,
    title: "Phase 6 Revision & Python Milestone Project",
    phase: 6,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["Python", "OOP", "files", "modules", "libraries"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 7: C Programming
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 74,
    title: "C Programming: Syntax, Variables, I/O & Operators",
    phase: 7,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["C language", "printf", "scanf", "variables", "data types", "operators", "compilation"],
  },
  {
    day: 75,
    title: "C Control Flow & Functions",
    phase: 7,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["if/else", "switch", "loops", "functions", "recursion basics", "call stack"],
  },
  {
    day: 76,
    title: "C Arrays & Strings",
    phase: 7,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["arrays", "multi-dimensional arrays", "strings", "string.h", "character arrays"],
  },
  {
    day: 77,
    title: "C Pointers & Memory Management: Core Systems Knowledge",
    phase: 7,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["pointers", "memory addresses", "malloc", "free", "pointer arithmetic", "heap vs stack"],
  },
  {
    day: 78,
    title: "C Structures, File I/O, Preprocessor & Phase 7 Milestone",
    phase: 7,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["struct", "union", "typedef", "file I/O", "#define", "macros", "header files"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 8: C++ Programming
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 79,
    title: "C++ Introduction: OOP, Classes & Objects",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["C++", "classes", "objects", "namespace", "references", "input/output streams"],
  },
  {
    day: 80,
    title: "Constructors, Destructors & RAII",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["constructors", "destructors", "RAII", "copy constructor", "operator overloading"],
  },
  {
    day: 81,
    title: "C++ STL: Vectors, Maps & Sets",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["STL", "vector", "map", "set", "pair", "modern C++ basics"],
  },
  {
    day: 82,
    title: "C++ STL Algorithms & Iterators",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["algorithm header", "sort", "find", "iterators", "lambda expressions in C++"],
  },
  {
    day: 83,
    title: "Templates & Generic Programming",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["templates", "function templates", "class templates", "generic programming", "type parameters"],
  },
  {
    day: 84,
    title: "Exception Handling & Smart Pointers",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["try/catch/throw in C++", "exception hierarchy", "unique_ptr", "shared_ptr", "memory safety"],
  },
  {
    day: 85,
    title: "C++ File I/O & Building a Multi-File Project",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["fstream", "file streams", "header files", "multi-file compilation", "makefiles basics"],
  },
  {
    day: 86,
    title: "Phase 7-8 Revision & C/C++ Milestone Project",
    phase: 8,
    difficulty: "advanced",
    estimatedMinutes: 100,
    topics: ["C", "C++", "pointers", "STL", "templates", "exception handling", "milestone project"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 9: Java Programming
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 87,
    title: "Java Introduction: JVM, JDK, JRE & First Program",
    phase: 9,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["Java", "JVM", "JDK", "JRE", "installation", "Hello World", "compilation", "bytecode"],
  },
  {
    day: 88,
    title: "Java Variables, Data Types, Operators & Input/Output",
    phase: 9,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["Java variables", "data types", "operators", "Scanner", "System.out", "type casting"],
  },
  {
    day: 89,
    title: "Java Control Flow: if-else, switch, loops & break/continue",
    phase: 9,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["if-else", "switch", "for loop", "while loop", "do-while", "break", "continue", "enhanced for"],
  },
  {
    day: 90,
    title: "Java Arrays, Strings & StringBuilder",
    phase: 9,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["arrays", "2D arrays", "String", "StringBuilder", "StringBuffer", "String methods"],
  },
  {
    day: 91,
    title: "Java Methods, Recursion & Variable Scope",
    phase: 9,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["methods", "parameters", "return types", "recursion", "scope", "overloading", "call stack"],
  },
  {
    day: 92,
    title: "Java OOP: Classes, Objects, Constructors & Encapsulation",
    phase: 9,
    difficulty: "intermediate",
    estimatedMinutes: 75,
    topics: ["OOP", "class", "object", "constructor", "encapsulation", "getter", "setter", "this keyword"],
  },
  {
    day: 93,
    title: "Java OOP: Inheritance, Polymorphism, Abstraction & Interfaces",
    phase: 9,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["inheritance", "polymorphism", "abstraction", "interface", "abstract class", "super", "override"],
  },
  {
    day: 94,
    title: "Java Exception Handling: try-catch, throws & Custom Exceptions",
    phase: 9,
    difficulty: "advanced",
    estimatedMinutes: 70,
    topics: ["exception handling", "try-catch", "finally", "throws", "throw", "checked", "unchecked", "custom exception"],
  },
  {
    day: 95,
    title: "Java Collections: List, Set, Map, Queue & Iterators",
    phase: 9,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["ArrayList", "LinkedList", "HashSet", "HashMap", "Queue", "Stack", "Iterator", "Collections class"],
  },
  {
    day: 96,
    title: "Build Tools: Gradle, Maven & Managing Dependencies",
    phase: 9,
    difficulty: "advanced",
    estimatedMinutes: 65,
    topics: ["Gradle", "Maven", "build.gradle", "pom.xml", "dependencies", "build tasks", "why build tools exist"],
  },
  {
    day: 97,
    title: "Java File I/O, JDBC & a First GUI with Swing",
    phase: 9,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["FileInputStream", "BufferedReader", "JDBC basics", "Connection", "ResultSet", "Swing", "JFrame", "JButton"],
  },
  {
    day: 98,
    title: "Phase 9 Revision & Java Milestone Project",
    phase: 9,
    difficulty: "advanced",
    estimatedMinutes: 100,
    topics: ["Java", "OOP", "collections", "exceptions", "Gradle", "JDBC", "GUI"],
    isRevisionDay: true,
    isMonthlyTest: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 10: Web Development Foundations
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 99,
    title: "HTML Fundamentals: Structure, Tags & Semantic Elements",
    phase: 10,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["HTML", "tags", "semantic HTML", "forms", "links", "images", "document structure"],
  },
  {
    day: 100,
    title: "CSS Fundamentals: Selectors, Box Model & Flexbox",
    phase: 10,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["CSS", "selectors", "box model", "flexbox", "colors", "units", "specificity"],
  },
  {
    day: 101,
    title: "CSS Grid, Responsive Design & Media Queries",
    phase: 10,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["CSS grid", "responsive design", "media queries", "mobile-first", "breakpoints"],
  },
  {
    day: 102,
    title: "JavaScript Fundamentals: Variables, Functions & DOM",
    phase: 10,
    difficulty: "intermediate",
    estimatedMinutes: 75,
    topics: ["JavaScript", "variables", "functions", "DOM", "events", "querySelector"],
  },
  {
    day: 103,
    title: "JavaScript Intermediate: Arrays, Objects, Fetch & Async/Await",
    phase: 10,
    difficulty: "intermediate",
    estimatedMinutes: 80,
    topics: ["arrays", "objects", "fetch API", "async/await", "promises", "JSON"],
  },
  {
    day: 104,
    title: "Building Your Portfolio Site: HTML + CSS + JS Together",
    phase: 10,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["portfolio project", "responsive layout", "form handling", "deployment basics", "GitHub Pages"],
  },
  {
    day: 105,
    title: "Phase 10 Revision & Web Foundations Milestone",
    phase: 10,
    difficulty: "intermediate",
    estimatedMinutes: 90,
    topics: ["HTML", "CSS", "JavaScript", "responsive design", "portfolio project"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 11: Advanced Web & Frameworks
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 106,
    title: "React.js: Components, JSX, Props & State",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["React", "JSX", "components", "props", "state", "useState", "virtual DOM"],
  },
  {
    day: 107,
    title: "React Hooks: useEffect, useContext & Custom Hooks",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["hooks", "useEffect", "useContext", "useReducer", "useRef", "custom hooks"],
  },
  {
    day: 108,
    title: "React Router: Navigation & Dynamic Routes",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 70,
    topics: ["React Router", "BrowserRouter", "Route", "Link", "useParams", "Navigate"],
  },
  {
    day: 109,
    title: "TypeScript with React: Types, Interfaces & Generics",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["TypeScript", "interfaces", "generics", "type aliases", "props typing", "event types"],
  },
  {
    day: 110,
    title: "Next.js: App Router, Server Components & API Routes",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["Next.js", "App Router", "Server Components", "API Routes", "SSR", "SSG"],
  },
  {
    day: 111,
    title: "State Management: Redux Toolkit, Zustand & Context API",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["Redux Toolkit", "Zustand", "Context API", "state management", "actions", "reducers"],
  },
  {
    day: 112,
    title: "Styling at Scale: Tailwind CSS & CSS-in-JS",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 70,
    topics: ["Tailwind CSS", "Styled Components", "CSS-in-JS", "utility classes", "dark mode"],
  },
  {
    day: 113,
    title: "Backend with Node.js: Express, Middleware & Authentication",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["Node.js", "Express", "middleware", "JWT", "OAuth basics", "session management"],
  },
  {
    day: 114,
    title: "Full-Stack Integration: React + Node.js + MongoDB",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["full-stack", "React", "Node.js", "MongoDB", "REST API", "CORS", "deployment"],
  },
  {
    day: 115,
    title: "Real-Time Apps: WebSockets & Socket.io",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["WebSockets", "Socket.io", "real-time", "events", "rooms", "bidirectional communication"],
  },
  {
    day: 116,
    title: "Performance & Testing: Lazy Loading, Code Splitting & Jest",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["lazy loading", "code splitting", "React.lazy", "Suspense", "Jest", "React Testing Library"],
  },
  {
    day: 117,
    title: "Phase 11 Revision & Full-Stack App Milestone",
    phase: 11,
    difficulty: "advanced",
    estimatedMinutes: 120,
    topics: ["React", "Next.js", "Node.js", "MongoDB", "WebSockets", "testing"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 12: Databases & Backend
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 118,
    title: "Database Fundamentals & SQL Basics: SELECT, WHERE, INSERT",
    phase: 12,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["databases", "SQL", "SELECT", "WHERE", "INSERT", "UPDATE", "DELETE", "tables"],
  },
  {
    day: 119,
    title: "SQL Joins, Aggregations & Subqueries",
    phase: 12,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["JOIN", "INNER JOIN", "LEFT JOIN", "GROUP BY", "aggregate functions", "subqueries"],
  },
  {
    day: 120,
    title: "Database Design Basics: ER Diagrams & Normalization (Awareness)",
    phase: 12,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["ER diagrams", "primary key", "foreign key", "normalization concept", "1NF/2NF/3NF overview", "why normalize"],
  },
  {
    day: 121,
    title: "NoSQL Databases: MongoDB & Firebase Basics",
    phase: 12,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["NoSQL", "MongoDB", "Firebase", "Firestore", "documents vs rows", "when to use NoSQL"],
  },
  {
    day: 122,
    title: "Building a REST API with Node.js, Express & SQLite",
    phase: 12,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["REST API", "Node.js", "Express", "SQLite", "CRUD endpoints", "routing"],
  },
  {
    day: 123,
    title: "ORMs & Database Tools: Prisma, Sequelize & Transactions Basics",
    phase: 12,
    difficulty: "advanced",
    estimatedMinutes: 70,
    topics: ["ORM", "Prisma", "Sequelize", "migrations", "transactions concept", "ACID overview"],
  },
  {
    day: 124,
    title: "Phase 12 Revision & Backend Milestone",
    phase: 12,
    difficulty: "advanced",
    estimatedMinutes: 90,
    topics: ["SQL", "NoSQL", "REST API", "ORMs", "database design"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 13: Mobile & Cross-Platform
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 125,
    title: "Mobile Development: Native vs Hybrid vs Cross-Platform",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 60,
    topics: ["mobile development", "native", "hybrid", "cross-platform", "iOS", "Android", "Flutter", "React Native"],
  },
  {
    day: 126,
    title: "React Native: Components, Navigation & Styling",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["React Native", "components", "View", "Text", "StyleSheet", "Navigation", "Expo"],
  },
  {
    day: 127,
    title: "React Native: APIs, Camera, Location & AsyncStorage",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["fetch API", "Camera", "Location", "AsyncStorage", "permissions"],
  },
  {
    day: 128,
    title: "Flutter: Dart Basics, Widgets & Hot Reload",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["Flutter", "Dart", "widgets", "StatelessWidget", "StatefulWidget", "hot reload", "material design"],
  },
  {
    day: 129,
    title: "Flutter: Navigation, State Management & API Integration",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["Flutter navigation", "Provider", "Riverpod", "API integration", "http package", "JSON parsing"],
  },
  {
    day: 130,
    title: "Progressive Web Apps: Service Workers, Manifest & Offline",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 70,
    topics: ["PWA", "service workers", "manifest", "offline", "caching", "installability"],
  },
  {
    day: 131,
    title: "Mobile Backend: Firebase, Supabase & Push Notifications",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["Firebase", "Supabase", "Firestore", "Auth", "push notifications", "real-time DB"],
  },
  {
    day: 132,
    title: "App Store & Play Store: Publishing, ASO & Monetization",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 65,
    topics: ["App Store", "Play Store", "publishing", "ASO", "monetization", "in-app purchases"],
  },
  {
    day: 133,
    title: "Mobile UI/UX & Testing: Design Systems, Animations & Detox/Appium",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 70,
    topics: ["mobile UI", "UX", "animations", "accessibility", "Detox", "Appium", "mobile testing"],
  },
  {
    day: 134,
    title: "Phase 13 Revision & Mobile App Milestone",
    phase: 13,
    difficulty: "advanced",
    estimatedMinutes: 120,
    topics: ["React Native", "Flutter", "PWA", "Firebase", "mobile UI/UX"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 14: AI & Machine Learning Basics
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 135,
    title: "What Is AI & Machine Learning? Real-World Uses (Awareness)",
    phase: 14,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["what is AI", "what is ML", "AI vs ML vs deep learning", "real-world AI examples", "why AI matters"],
  },
  {
    day: 136,
    title: "How ChatGPT & LLMs Work (Conceptually, No Deep Math)",
    phase: 14,
    difficulty: "beginner",
    estimatedMinutes: 55,
    topics: ["LLM concept", "how ChatGPT works", "tokens", "training vs inference", "context window"],
  },
  {
    day: 137,
    title: "Prompt Engineering Basics: Getting Great Answers from AI",
    phase: 14,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["prompt engineering", "few-shot prompting", "system prompts", "chain-of-thought basics"],
  },
  {
    day: 138,
    title: "Using AI APIs: OpenAI-Compatible Endpoints in Your Own Code",
    phase: 14,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["AI APIs", "API keys", "OpenAI-compatible API", "requests", "responses", "streaming"],
  },
  {
    day: 139,
    title: "Project: Build a Simple AI Chatbot",
    phase: 14,
    difficulty: "intermediate",
    estimatedMinutes: 85,
    topics: ["chatbot project", "conversation history", "system prompt design", "basic RAG idea"],
  },
  {
    day: 140,
    title: "Machine Learning Concepts: Supervised vs Unsupervised (Awareness)",
    phase: 14,
    difficulty: "intermediate",
    estimatedMinutes: 55,
    topics: ["supervised learning", "unsupervised learning", "training data", "overfitting concept", "where ML is used"],
  },
  {
    day: 141,
    title: "Phase 14 Revision & AI Chatbot Milestone",
    phase: 14,
    difficulty: "intermediate",
    estimatedMinutes: 80,
    topics: ["AI basics", "LLMs", "prompt engineering", "AI APIs", "chatbot project"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 15: Data Science Basics
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 142,
    title: "What Is Data Science? The Pipeline Explained (Awareness)",
    phase: 15,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["data science", "data pipeline", "collection", "cleaning", "analysis", "why data science matters"],
  },
  {
    day: 143,
    title: "NumPy & Pandas Basics: Working with Real Data",
    phase: 15,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["NumPy", "Pandas", "DataFrames", "reading CSV", "filtering", "grouping"],
  },
  {
    day: 144,
    title: "Data Visualization Basics: Matplotlib & Simple Charts",
    phase: 15,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["Matplotlib", "line charts", "bar charts", "histograms", "basic visualization principles"],
  },
  {
    day: 145,
    title: "Phase 15 Revision & Data Analysis Mini-Project",
    phase: 15,
    difficulty: "intermediate",
    estimatedMinutes: 75,
    topics: ["data science pipeline", "Pandas", "visualization", "mini project"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 16: Cloud & DevOps Basics
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 146,
    title: "What Is DevOps & Cloud Computing? (Awareness)",
    phase: 16,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["DevOps culture", "cloud computing", "what is the cloud", "why companies use cloud", "CI/CD concept"],
  },
  {
    day: 147,
    title: "Docker Basics: Images, Containers & Core Commands",
    phase: 16,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["Docker", "images", "containers", "Dockerfile", "docker run", "docker build", "docker ps"],
  },
  {
    day: 148,
    title: "CI/CD Basics: GitHub Actions Workflows",
    phase: 16,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["CI/CD concept", "GitHub Actions", "workflows", "jobs", "automated testing/deploy"],
  },
  {
    day: 149,
    title: "Cloud Platforms Overview: AWS, GCP & Azure (Awareness)",
    phase: 16,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["AWS overview", "GCP overview", "Azure overview", "what each cloud offers", "choosing a provider"],
  },
  {
    day: 150,
    title: "Project: Deploying a Live App with Vercel/Netlify/Render",
    phase: 16,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["deployment", "Vercel", "Netlify", "Render", "environment variables", "custom domains"],
  },
  {
    day: 151,
    title: "Phase 16 Revision & Cloud Deployment Milestone",
    phase: 16,
    difficulty: "intermediate",
    estimatedMinutes: 80,
    topics: ["DevOps", "Docker", "CI/CD", "cloud platforms", "deployment project"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 17: Cybersecurity Basics
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 152,
    title: "Cybersecurity Fundamentals: Threats & the CIA Triad (Awareness)",
    phase: 17,
    difficulty: "beginner",
    estimatedMinutes: 50,
    topics: ["cybersecurity", "threats", "CIA triad", "attack vectors", "why security matters"],
  },
  {
    day: 153,
    title: "Practical Digital Safety: Strong Passwords, 2FA & Phishing",
    phase: 17,
    difficulty: "beginner",
    estimatedMinutes: 55,
    topics: ["password managers", "2FA", "phishing recognition", "safe browsing", "account recovery"],
  },
  {
    day: 154,
    title: "Common Attack Types Overview: XSS, SQL Injection & Malware (Awareness)",
    phase: 17,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["XSS", "SQL injection", "malware", "ransomware", "how attacks happen conceptually"],
  },
  {
    day: 155,
    title: "Ethical Hacking & Security Careers: What, Why & How to Start",
    phase: 17,
    difficulty: "intermediate",
    estimatedMinutes: 60,
    topics: ["ethical hacking concept", "responsible disclosure", "security career paths", "certifications overview"],
  },
  {
    day: 156,
    title: "Phase 17 Revision & Personal Digital-Safety Audit",
    phase: 17,
    difficulty: "intermediate",
    estimatedMinutes: 70,
    topics: ["cybersecurity basics", "digital safety checklist", "personal security audit"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 18: MASTERY TRACK — Data Structures & Algorithms Deep Dive
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 157,
    title: "Mastery: Arrays & Strings Deep Dive (Two Pointers, Sliding Window)",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["two pointers", "sliding window", "prefix sums", "array manipulation", "string algorithms"],
  },
  {
    day: 158,
    title: "Mastery: Linked Lists, Stacks & Queues Implementation Deep Dive",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["singly/doubly linked lists", "stack implementation", "queue implementation", "monotonic stack"],
  },
  {
    day: 159,
    title: "Mastery: Trees — BST, Traversals & Balanced Trees",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["binary trees", "BST", "inorder/preorder/postorder", "AVL trees", "tree height/balance"],
  },
  {
    day: 160,
    title: "Mastery: Heaps, Tries & Advanced Tree Structures",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["heaps", "priority queue", "trie", "segment tree overview", "Fenwick tree overview"],
  },
  {
    day: 161,
    title: "Mastery: Graphs — Representations, BFS & DFS",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["graph representations", "adjacency list/matrix", "BFS", "DFS", "connected components"],
  },
  {
    day: 162,
    title: "Mastery: Graph Algorithms — Dijkstra, MST & Topological Sort",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["Dijkstra's algorithm", "Prim's algorithm", "Kruskal's algorithm", "topological sort", "cycle detection"],
  },
  {
    day: 163,
    title: "Mastery: Dynamic Programming Part 1 — Foundations",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["memoization", "tabulation", "1D DP", "classic DP problems", "recursion to DP"],
  },
  {
    day: 164,
    title: "Mastery: Dynamic Programming Part 2 — 2D DP & Optimization",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["2D DP", "knapsack problems", "longest common subsequence", "DP optimization tricks"],
  },
  {
    day: 165,
    title: "Mastery: Greedy Algorithms & Backtracking",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["greedy algorithms", "backtracking", "N-Queens", "subsets/permutations", "when greedy fails"],
  },
  {
    day: 166,
    title: "Mastery: Hashing Deep Dive & Problem-Solving Patterns",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["hash tables internals", "collision handling", "common interview patterns", "pattern recognition"],
  },
  {
    day: 167,
    title: "Mastery: Competitive Programming Practice & Interview Patterns",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 90,
    topics: ["mock interview problems", "time/space complexity analysis", "problem-solving strategy", "mixed practice set"],
  },
  {
    day: 168,
    title: "DSA Mastery Milestone: 10-Problem Challenge",
    phase: 18,
    difficulty: "advanced",
    estimatedMinutes: 120,
    topics: ["DSA comprehensive review", "milestone problem set", "interview readiness"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 19: MASTERY TRACK — Cybersecurity & Ethical Hacking Deep Dive
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 169,
    title: "Mastery: Network Security — Firewalls, IDS/IPS & VPNs",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["firewalls", "IDS", "IPS", "VPN internals", "packet filtering", "intrusion detection"],
  },
  {
    day: 170,
    title: "Mastery: Cryptography — Symmetric, Asymmetric & Hashing",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["cryptography", "symmetric encryption", "asymmetric encryption", "hashing", "RSA", "AES", "SHA", "digital signatures"],
  },
  {
    day: 171,
    title: "Mastery: Web Security — OWASP Top 10 in Practice",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["OWASP Top 10", "XSS deep dive", "CSRF", "SQL injection deep dive", "security headers", "input sanitization"],
  },
  {
    day: 172,
    title: "Mastery: Ethical Hacking — Reconnaissance & Scanning",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["reconnaissance", "scanning", "enumeration", "Nmap", "Kali Linux basics"],
  },
  {
    day: 173,
    title: "Mastery: Penetration Testing — Exploitation & Reporting",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["penetration testing", "exploitation basics", "Metasploit overview", "vulnerability reporting"],
  },
  {
    day: 174,
    title: "Mastery: Malware Analysis & Digital Forensics Basics",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["malware types", "behavior analysis", "digital forensics", "chain of custody", "evidence handling"],
  },
  {
    day: 175,
    title: "Mastery: Security Tools — Burp Suite, Wireshark & Bug Bounties",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["Burp Suite", "Wireshark", "bug bounty platforms", "HackerOne", "responsible disclosure reports"],
  },
  {
    day: 176,
    title: "Cybersecurity Mastery Milestone: Guided Penetration Test",
    phase: 19,
    difficulty: "advanced",
    estimatedMinutes: 120,
    topics: ["penetration testing project", "security audit report", "milestone review"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 20: MASTERY TRACK — Data Science & Advanced AI Deep Dive
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 177,
    title: "Mastery: Statistics for Data Science — Hypothesis Testing",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["descriptive statistics", "inferential statistics", "hypothesis testing", "p-value", "confidence intervals"],
  },
  {
    day: 178,
    title: "Mastery: Advanced Visualization — Seaborn, Plotly & Dashboards",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["Seaborn", "Plotly", "interactive dashboards", "storytelling with data"],
  },
  {
    day: 179,
    title: "Mastery: Machine Learning with Scikit-Learn",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["scikit-learn", "regression", "classification", "clustering", "cross-validation", "grid search"],
  },
  {
    day: 180,
    title: "Mastery: Deep Learning — TensorFlow, Keras, CNNs & RNNs",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["TensorFlow", "Keras", "CNN", "RNN", "transfer learning"],
  },
  {
    day: 181,
    title: "Mastery: Natural Language Processing — spaCy, NLTK & Transformers",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["NLP", "spaCy", "NLTK", "transformers", "tokenization", "sentiment analysis"],
  },
  {
    day: 182,
    title: "Mastery: Big Data & Data Engineering — Spark, ETL & Airflow",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["Big Data", "Spark", "ETL pipelines", "Airflow", "data warehouses"],
  },
  {
    day: 183,
    title: "Mastery: Large Language Models — Architecture & Fine-Tuning",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 90,
    topics: ["LLM architecture", "transformers deep dive", "fine-tuning", "LoRA", "QLoRA"],
  },
  {
    day: 184,
    title: "Mastery: Advanced Prompt Engineering — Chain-of-Thought & Agents",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["chain-of-thought", "ReAct", "agentic AI", "planning", "reasoning patterns"],
  },
  {
    day: 185,
    title: "Mastery: Advanced RAG — Hybrid Search & Re-ranking",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["RAG", "hybrid search", "re-ranking", "evaluation", "chunking strategies"],
  },
  {
    day: 186,
    title: "Mastery: AI Agents — Tool Use & Multi-Agent Systems",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["AI agents", "tool use", "multi-agent collaboration", "autonomous systems"],
  },
  {
    day: 187,
    title: "Mastery: AI Safety, Bias & Responsible AI",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 75,
    topics: ["AI safety", "alignment", "bias", "hallucinations", "responsible AI", "ethics"],
  },
  {
    day: 188,
    title: "Data Science & AI Mastery Milestone: Train a Model + RAG Chatbot",
    phase: 20,
    difficulty: "advanced",
    estimatedMinutes: 120,
    topics: ["ML project", "RAG chatbot project", "milestone review", "presentation"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 21: MASTERY TRACK — DevOps, Cloud & System Design Deep Dive
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 189,
    title: "Mastery: Docker Deep Dive — Networks, Volumes & Compose",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["Docker networks", "volumes", "docker-compose", "multi-stage builds", "Dockerfile optimization"],
  },
  {
    day: 190,
    title: "Mastery: Kubernetes — Pods, Services & Deployments",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["Kubernetes", "pods", "services", "deployments", "Ingress", "kubectl"],
  },
  {
    day: 191,
    title: "Mastery: AWS Deep Dive — EC2, S3, Lambda & IAM",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["AWS", "EC2", "S3", "Lambda", "IAM", "serverless basics"],
  },
  {
    day: 192,
    title: "Mastery: GCP & Azure — Compute, Storage & Functions",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["GCP", "Azure", "Compute Engine", "App Service", "Cloud Functions", "Azure Functions"],
  },
  {
    day: 193,
    title: "Mastery: Infrastructure as Code — Terraform & Ansible",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["Terraform", "Ansible", "IaC", "provisioning", "configuration management"],
  },
  {
    day: 194,
    title: "Mastery: Monitoring & Observability — Prometheus, Grafana & ELK",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["Prometheus", "Grafana", "ELK Stack", "monitoring", "logging", "alerts"],
  },
  {
    day: 195,
    title: "Mastery: Microservices & Service Mesh",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["microservices", "service mesh", "gRPC", "API gateway", "inter-service communication"],
  },
  {
    day: 196,
    title: "Mastery: System Design Fundamentals — Scaling & Load Balancing",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["system design", "load balancing", "horizontal vs vertical scaling", "CAP theorem", "CDN"],
  },
  {
    day: 197,
    title: "Mastery: System Design — Caching, Sharding & Database Replication",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 85,
    topics: ["caching strategies", "Redis", "database sharding", "replication", "consistency tradeoffs"],
  },
  {
    day: 198,
    title: "DevOps & System Design Mastery Milestone",
    phase: 21,
    difficulty: "advanced",
    estimatedMinutes: 120,
    topics: ["Docker", "Kubernetes", "cloud", "system design", "milestone project"],
    isRevisionDay: true,
    isMilestone: true,
  },

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 22: Career Prep & Grand Capstone
  // ══════════════════════════════════════════════════════════════════════
  {
    day: 199,
    title: "Building a Standout Resume & LinkedIn Profile",
    phase: 22,
    difficulty: "intermediate",
    estimatedMinutes: 65,
    topics: ["resume writing", "LinkedIn optimization", "portfolio", "personal branding"],
  },
  {
    day: 200,
    title: "Technical Interview Prep: DSA Questions & Mock Rounds",
    phase: 22,
    difficulty: "advanced",
    estimatedMinutes: 80,
    topics: ["technical interviews", "DSA interview questions", "mock interviews", "communication during interviews"],
  },
];

/** Look up a single lesson's metadata */
export function getLessonByDay(day: number): LessonMeta | undefined {
  return CURRICULUM.find((l) => l.day === day);
}

/** Get the current phase for a day */
export function getPhaseForDay(day: number): Phase | undefined {
  return PHASES.find((p) => p.days.includes(day));
}

/** Get all lessons in a phase */
export function getLessonsInPhase(phaseId: number): LessonMeta[] {
  return CURRICULUM.filter((l) => l.phase === phaseId);
}

/** Calculate overall progress percentage */
export function getProgressPercent(completedDays: number[]): number {
  return Math.round((completedDays.length / CURRICULUM.length) * 100);
}

/** Get next unlocked day after completing a set of days */
export function getNextDay(completedDays: number[]): number {
  if (completedDays.length === 0) return 1;
  const maxCompleted = Math.max(...completedDays);
  return Math.min(maxCompleted + 1, CURRICULUM.length);
}

/** Check if a day is a revision / test / milestone day */
export function isDaySpecial(day: number): { revision: boolean; monthly: boolean; milestone: boolean } {
  const meta = getLessonByDay(day);
  return {
    revision: meta?.isRevisionDay ?? false,
    monthly: meta?.isMonthlyTest ?? false,
    milestone: meta?.isMilestone ?? false,
  };
}

// ── Enrichment Utilities ──────────────────────────────────────────────────

/** Get all lessons that match a specific tag */
export function getLessonsByTag(tag: string): LessonMeta[] {
  return CURRICULUM.filter((l) => l.tags?.includes(tag));
}

/** Get lessons that can be unlocked after completing a day */
export function getUnlockedDays(completedDays: number[]): number[] {
  const completed = new Set(completedDays);
  return CURRICULUM
    .filter((lesson) => {
      if (lesson.day <= 1) return true;
      const prereqs = lesson.prerequisites ?? [lesson.day - 1];
      return prereqs.every((p) => completed.has(p));
    })
    .map((l) => l.day)
    .filter((d) => !completed.has(d));
}

/** Get the total estimated study time for a phase in minutes */
export function getPhaseStudyMinutes(phaseId: number): number {
  return getLessonsInPhase(phaseId).reduce((sum, l) => sum + l.estimatedMinutes, 0);
}

/** Format estimated minutes into a human-readable duration */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Get phase summary with stats */
export interface PhaseSummary {
  phase: Phase;
  totalLessons: number;
  totalMinutes: number;
  difficultyBreakdown: Record<string, number>;
  revisionDays: number[];
  milestoneDays: number[];
}

export function getPhaseSummary(phaseId: number): PhaseSummary | undefined {
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) return undefined;
  const lessons = getLessonsInPhase(phaseId);
  const difficultyBreakdown: Record<string, number> = {};
  const revisionDays: number[] = [];
  const milestoneDays: number[] = [];

  for (const l of lessons) {
    difficultyBreakdown[l.difficulty] = (difficultyBreakdown[l.difficulty] ?? 0) + 1;
    if (l.isRevisionDay) revisionDays.push(l.day);
    if (l.isMilestone) milestoneDays.push(l.day);
  }

  return {
    phase,
    totalLessons: lessons.length,
    totalMinutes: lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0),
    difficultyBreakdown,
    revisionDays,
    milestoneDays,
  };
}

/** Get topics covered up to a given day */
export function getTopicsCoveredUpTo(day: number): string[] {
  const topics = new Set<string>();
  for (const l of CURRICULUM) {
    if (l.day > day) break;
    for (const t of l.topics) topics.add(t);
  }
  return [...topics];
}

/** Get a curriculum overview for the roadmap panel */
export interface CurriculumOverview {
  totalDays: number;
  totalPhases: number;
  totalMinutes: number;
  phases: PhaseSummary[];
}

export function getCurriculumOverview(): CurriculumOverview {
  return {
    totalDays: CURRICULUM.length,
    totalPhases: PHASES.length,
    totalMinutes: CURRICULUM.reduce((sum, l) => sum + l.estimatedMinutes, 0),
    phases: PHASES.map((p) => getPhaseSummary(p.id)).filter((s): s is PhaseSummary => s !== undefined),
  };
}

/** Check if all phase lessons are completed */
export function isPhaseComplete(phaseId: number, completedDays: number[]): boolean {
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) return false;
  return phase.days.every((d) => completedDays.includes(d));
}

/** Get streak-friendly data: consecutive days completed from latest */
export function getLongestStreak(completedDays: number[]): number {
  if (completedDays.length === 0) return 0;
  const sorted = [...completedDays].sort((a, b) => a - b);
  let maxStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  return maxStreak;
}
