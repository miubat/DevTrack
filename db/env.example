export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER';
export type IssueType = 'STORY' | 'TASK' | 'BUG';
export type IssueStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOWEST' | 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
export type Severity = 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';
export type EntityType = 'ISSUE' | 'SPRINT' | 'PROJECT' | 'COMMENT';

export interface UserRow {
  id: bigint;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustResetPw: boolean;
  createdAt: Date;
}

export interface ProjectRow {
  id: bigint;
  key: string;
  name: string;
  description: string;
  objectives: string;
  startDate: Date;
  endDate: Date;
  managerId: bigint;
  nextIssueNumber: number;
  isArchived: boolean;
  createdAt: Date;
}

export interface ProjectMemberRow {
  projectId: bigint;
  userId: bigint;
  addedAt: Date;
}

export interface SprintRow {
  id: bigint;
  projectId: bigint;
  name: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  committedPoints: number | null;
  completedPoints: number | null;
  startedAt: Date | null;
  closedAt: Date | null;
}

export interface IssueRow {
  id: bigint;
  projectId: bigint;
  number: number;
  type: IssueType;
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  storyPoints: number | null;
  assigneeId: bigint | null;
  reporterId: bigint;
  backlogRank: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
}

export interface BugDetailRow {
  issueId: bigint;
  environment: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: Severity;
}

export interface IssueLinkRow {
  bugId: bigint;
  storyId: bigint;
  createdBy: bigint;
  createdAt: Date;
}

export interface SprintIssueRow {
  sprintId: bigint;
  issueId: bigint;
  isOpen: boolean;
  addedAfterStart: boolean;
  addedAt: Date;
  removedAt: Date | null;
}

export interface CommentRow {
  id: bigint;
  issueId: bigint;
  authorId: bigint;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
}

export interface ActivityRow {
  id: bigint;
  projectId: bigint;
  entityType: EntityType;
  entityId: bigint;
  actorId: bigint;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface SeedData {
  users: UserRow[];
  projects: ProjectRow[];
  projectMembers: ProjectMemberRow[];
  sprints: SprintRow[];
  issues: IssueRow[];
  bugDetails: BugDetailRow[];
  issueLinks: IssueLinkRow[];
  sprintIssues: SprintIssueRow[];
  comments: CommentRow[];
  activities: ActivityRow[];
}

type ActivityDraft = Omit<ActivityRow, 'id'>;
type Group = 'S1_DONE' | 'S1_CARRIED' | 'S2' | 'S3' | 'BACKLOG';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const utc = (y: number, m: number, d: number, h = 0, mi = 0): Date =>
  new Date(Date.UTC(y, m - 1, d, h, mi));

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const RAHIM = 2n;
const SADIA = 3n;
const KARIM = 4n;
const HASAN = 5n;
const NILA = 6n;
const TOMAL = 7n;
const FARHAN = 8n;
const MIM = 9n;
const IMRAN = 10n;
const TANIA = 11n;

const USER_DEFS: ReadonlyArray<readonly [string, string, Role]> = [
  ['Admin User', 'admin@devtrack.local', 'ADMIN'],
  ['Rahim Ahmed', 'rahim@devtrack.local', 'PROJECT_MANAGER'],
  ['Sadia Rahman', 'sadia@devtrack.local', 'PROJECT_MANAGER'],
  ['Karim Hossain', 'karim@devtrack.local', 'TEAM_MEMBER'],
  ['Hasan Mahmud', 'hasan@devtrack.local', 'TEAM_MEMBER'],
  ['Nila Akter', 'nila@devtrack.local', 'TEAM_MEMBER'],
  ['Tomal Sarker', 'tomal@devtrack.local', 'TEAM_MEMBER'],
  ['Farhan Islam', 'farhan@devtrack.local', 'TEAM_MEMBER'],
  ['Mim Chowdhury', 'mim@devtrack.local', 'TEAM_MEMBER'],
  ['Imran Hossain', 'imran@devtrack.local', 'TEAM_MEMBER'],
  ['Tania Sultana', 'tania@devtrack.local', 'TEAM_MEMBER'],
];

interface ProjectDef {
  id: bigint;
  key: string;
  name: string;
  description: string;
  objectives: string;
  manager: bigint;
  members: bigint[];
  issueCount: number;
  sprintIds: [bigint, bigint, bigint];
  objects: string[];
}

const PROJECT_DEFS: ProjectDef[] = [
  {
    id: 1n,
    key: 'ECOM',
    name: 'E-Commerce Platform',
    description: 'Online store with catalog, cart, checkout and order tracking.',
    objectives: 'Launch the store, support card and mobile payments, reduce checkout drop-off.',
    manager: RAHIM,
    members: [RAHIM, KARIM, HASAN, NILA, TOMAL, FARHAN],
    issueCount: 80,
    sprintIds: [1n, 2n, 3n],
    objects: [
      'customer registration', 'product catalog', 'shopping cart', 'checkout flow', 'payment gateway',
      'order history', 'wishlist', 'discount codes', 'product search', 'user profile',
      'email notifications', 'admin dashboard', 'inventory sync', 'shipping rates', 'product reviews',
    ],
  },
  {
    id: 2n,
    key: 'HRMS',
    name: 'HR Management System',
    description: 'Internal HR tool for onboarding, leave, attendance and payroll summaries.',
    objectives: 'Replace spreadsheets for leave and attendance, give managers one team view.',
    manager: SADIA,
    members: [SADIA, KARIM, FARHAN, MIM, IMRAN, TANIA],
    issueCount: 70,
    sprintIds: [4n, 5n, 6n],
    objects: [
      'employee onboarding', 'leave requests', 'attendance tracking', 'payroll summary', 'performance reviews',
      'employee directory', 'shift roster', 'holiday calendar', 'document uploads', 'role permissions',
      'expense claims', 'recruitment pipeline', 'training records', 'org chart', 'notice board',
    ],
  },
];

const STORY_VERBS = ['Implement', 'Build', 'Add', 'Improve'];
const TASK_VERBS = ['Set up', 'Configure', 'Document', 'Refactor'];
const BUG_PHRASES = [
  'fails on empty input',
  'shows the wrong total',
  'returns a 500 error',
  'is not saved after refresh',
  'allows duplicate entries',
];
const ENVIRONMENTS = ['Staging, Chrome 130', 'Staging, Firefox 131', 'Staging, Edge 130', 'QA server, Safari 18'];
const COMMENT_BODIES = [
  'Repro steps updated',
  'Still reproducible on Firefox',
  'Fixed in the latest build, ready for review',
  'Please add acceptance criteria',
  'Blocked by the API change, checking with the team',
  'Verified on staging',
  'Needs a design review first',
  'Estimate looks too low, can we split this?',
];

const TYPE_WEIGHTS: ReadonlyArray<readonly [IssueType, number]> = [['STORY', 55], ['TASK', 25], ['BUG', 20]];
const POINT_WEIGHTS: ReadonlyArray<readonly [number, number]> = [[1, 15], [2, 20], [3, 25], [5, 20], [8, 12], [13, 6], [21, 2]];
const PRIORITY_WEIGHTS: ReadonlyArray<readonly [Priority, number]> = [
  ['LOWEST', 5], ['LOW', 20], ['MEDIUM', 40], ['HIGH', 27], ['HIGHEST', 8],
];
const SEVERITY_WEIGHTS: ReadonlyArray<readonly [Severity, number]> = [
  ['MINOR', 25], ['MAJOR', 45], ['CRITICAL', 22], ['BLOCKER', 8],
];

const S1_PLAN_AT = utc(2026, 10, 10, 16, 0);
const S1_START = utc(2026, 10, 11, 4, 0);
const S1_CLOSE = utc(2026, 10, 24, 11, 0);
const S2_PLAN_AT = utc(2026, 10, 24, 15, 0);
const S2_START = utc(2026, 10, 25, 4, 0);
const S2_ADDED_AT = utc(2026, 10, 29, 8, 0);
const S3_PLAN_AT = utc(2026, 11, 3, 10, 0);

const SPRINT_DATES: ReadonlyArray<readonly [Date, Date]> = [
  [utc(2026, 10, 11), utc(2026, 10, 24)],
  [utc(2026, 10, 25), utc(2026, 11, 7)],
  [utc(2026, 11, 8), utc(2026, 11, 21)],
];

const S2_PLAN_BASE: IssueStatus[][] = [
  ...Array.from({ length: 5 }, (): IssueStatus[] => ['IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  ...Array.from({ length: 4 }, (): IssueStatus[] => ['IN_PROGRESS', 'IN_REVIEW']),
  ...Array.from({ length: 4 }, (): IssueStatus[] => ['IN_PROGRESS']),
  ['IN_PROGRESS', 'IN_REVIEW', 'DONE', 'IN_PROGRESS'],
  ...Array.from({ length: 5 }, (): IssueStatus[] => []),
];

const groupOf = (n: number): Group =>
  n <= 12 ? 'S1_DONE' : n <= 15 ? 'S1_CARRIED' : n <= 34 ? 'S2' : n <= 44 ? 'S3' : 'BACKLOG';

export function buildSeedData(): SeedData {
  const rnd = mulberry32(20261104);

  function pick<T>(items: readonly T[]): T {
    return items[Math.floor(rnd() * items.length)];
  }
  function chance(p: number): boolean {
    return rnd() < p;
  }
  function weighted<T>(items: ReadonlyArray<readonly [T, number]>): T {
    const total = items.reduce((sum, [, w]) => sum + w, 0);
    let r = rnd() * total;
    for (const [value, w] of items) {
      r -= w;
      if (r < 0) return value;
    }
    return items[items.length - 1][0];
  }
  function shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function ascendingTimes(count: number, from: Date, to: Date): Date[] {
    const span = to.getTime() - from.getTime();
    const ts = Array.from({ length: count }, () => from.getTime() + Math.floor(rnd() * span)).sort((a, b) => a - b);
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] <= ts[i - 1]) ts[i] = ts[i - 1] + 60_000;
    }
    return ts.map((t) => new Date(t));
  }

  const users: UserRow[] = USER_DEFS.map(([fullName, email, role], i) => ({
    id: BigInt(i + 1),
    fullName,
    email,
    role,
    isActive: true,
    mustResetPw: false,
    createdAt: utc(2026, 10, 1, 4, 0),
  }));
  const nameOf = (id: bigint): string => users[Number(id) - 1].fullName;

  const projects: ProjectRow[] = [];
  const projectMembers: ProjectMemberRow[] = [];
  const sprints: SprintRow[] = [];
  const issues: IssueRow[] = [];
  const bugDetails: BugDetailRow[] = [];
  const issueLinks: IssueLinkRow[] = [];
  const sprintIssues: SprintIssueRow[] = [];
  const comments: CommentRow[] = [];
  const drafts: ActivityDraft[] = [];

  const draft = (
    projectId: bigint,
    entityType: EntityType,
    entityId: bigint,
    actorId: bigint,
    action: string,
    field: string | null,
    oldValue: string | null,
    newValue: string | null,
    createdAt: Date,
  ): ActivityDraft => ({ projectId, entityType, entityId, actorId, action, field, oldValue, newValue, createdAt });

  let issueSeq = 1n;
  let commentSeq = 1n;

  for (const p of PROJECT_DEFS) {
    const [s1, s2, s3] = p.sprintIds;
    const sprintNames = [1, 2, 3].map((i) => `${p.key} Sprint ${i}`);
    const s2Plans = shuffle(S2_PLAN_BASE);
    const addedIdx = s2Plans.findIndex((plan) => plan.length === 0);
    const counters: Record<IssueType, number> = { STORY: 0, TASK: 0, BUG: 0 };
    const stories: bigint[] = [];
    const bugs: Array<{ id: bigint; reporterId: bigint; createdAt: Date }> = [];
    const commentable: Array<{ id: bigint }> = [];
    let s1Committed = 0;
    let s1Completed = 0;
    let s2Committed = 0;

    drafts.push(draft(p.id, 'PROJECT', p.id, p.manager, 'CREATED', null, null, null, utc(2026, 10, 1, 4, 0)));
    for (const userId of p.members) {
      projectMembers.push({ projectId: p.id, userId, addedAt: utc(2026, 10, 1, 5, 0) });
    }

    const titleFor = (type: IssueType, idx: number): string => {
      const o = p.objects;
      if (type === 'STORY') return `${STORY_VERBS[idx % 4]} ${o[Math.floor(idx / 4) % o.length]}`;
      if (type === 'TASK') return `${TASK_VERBS[idx % 4]} ${o[(Math.floor(idx / 4) + 3) % o.length]}`;
      return `${capitalize(o[idx % o.length])} ${BUG_PHRASES[Math.floor(idx / o.length) % BUG_PHRASES.length]}`;
    };

    for (let n = 1; n <= p.issueCount; n++) {
      const group = groupOf(n);
      const type: IssueType = n === 1 ? 'STORY' : weighted(TYPE_WEIGHTS);
      const title = titleFor(type, counters[type]++);
      const id = issueSeq++;

      let path: IssueStatus[] = [];
      let addedAfterStart = false;
      if (group === 'S1_DONE') path = ['IN_PROGRESS', 'IN_REVIEW', 'DONE'];
      else if (n === 13) path = ['IN_PROGRESS'];
      else if (n === 14) path = ['IN_PROGRESS', 'IN_REVIEW'];
      else if (group === 'S2') {
        path = s2Plans[n - 16];
        addedAfterStart = n - 16 === addedIdx;
      }

      const inS1 = group === 'S1_DONE' || group === 'S1_CARRIED';
      const sprintId: bigint | null = inS1 ? s1 : group === 'S2' ? s2 : group === 'S3' ? s3 : null;
      const sprintName: string | null = inS1 ? sprintNames[0] : group === 'S2' ? sprintNames[1] : group === 'S3' ? sprintNames[2] : null;
      const addedAt: Date | null = inS1
        ? S1_PLAN_AT
        : group === 'S2'
          ? addedAfterStart
            ? S2_ADDED_AT
            : S2_PLAN_AT
          : group === 'S3'
            ? S3_PLAN_AT
            : null;

      const assigneeId: bigint | null = group === 'BACKLOG' ? (chance(0.35) ? pick(p.members) : null) : pick(p.members);
      const reporterId = pick(p.members);
      const createdAt = addedAfterStart
        ? utc(2026, 10, 29, 3, 0)
        : utc(2026, 10, 1 + Math.floor(rnd() * 9), 3 + Math.floor(rnd() * 12), Math.floor(rnd() * 60));
      const hasPoints = group === 'BACKLOG' ? !chance(0.2) : !(group === 'S3' && n === 44);
      const storyPoints = hasPoints ? weighted(POINT_WEIGHTS) : null;
      const priority = weighted(PRIORITY_WEIGHTS);

      const acts: ActivityDraft[] = [];
      const push = (actor: bigint, action: string, field: string | null, oldV: string | null, newV: string | null, at: Date): void => {
        acts.push(draft(p.id, 'ISSUE', id, actor, action, field, oldV, newV, at));
      };

      push(reporterId, 'CREATED', null, null, null, createdAt);
      if (assigneeId !== null) {
        push(p.manager, 'FIELD_CHANGED', 'assignee', null, nameOf(assigneeId), new Date(createdAt.getTime() + 3_600_000));
      }
      if (sprintName !== null && addedAt !== null) {
        push(p.manager, 'FIELD_CHANGED', 'sprint', null, sprintName, addedAt);
      }

      let doneAt: Date | null = null;
      if (path.length > 0) {
        const from = inS1 ? utc(2026, 10, 11, 5, 0) : utc(2026, 10, 25, 5, 0);
        const to = inS1 ? utc(2026, 10, 24, 10, 0) : utc(2026, 11, 4, 2, 0);
        const times = ascendingTimes(path.length, from, to);
        for (let i = 0; i < path.length; i++) {
          const fromStatus: IssueStatus = i === 0 ? 'TO_DO' : path[i - 1];
          const toStatus = path[i];
          const actor = fromStatus === 'DONE' ? p.manager : (assigneeId ?? pick(p.members));
          push(actor, 'FIELD_CHANGED', 'status', fromStatus, toStatus, times[i]);
          doneAt = toStatus === 'DONE' ? times[i] : null;
        }
      }
      if (group === 'S1_CARRIED' && sprintName !== null) {
        push(p.manager, 'FIELD_CHANGED', 'sprint', sprintName, null, S1_CLOSE);
      }

      const status: IssueStatus = path.length > 0 ? path[path.length - 1] : 'TO_DO';
      const version = 1 + acts.filter((a) => a.action === 'FIELD_CHANGED').length;
      const updatedAt = new Date(Math.max(...acts.map((a) => a.createdAt.getTime())));
      const backlogRank = group === 'S1_CARRIED' ? n - 12 : group === 'BACKLOG' ? 1000 + n * 10 : n * 10;

      issues.push({
        id,
        projectId: p.id,
        number: n,
        type,
        title,
        description: `Seed data for ${p.key}-${n}.`,
        status,
        priority,
        storyPoints,
        assigneeId,
        reporterId,
        backlogRank,
        version,
        createdAt,
        updatedAt,
        doneAt,
      });
      drafts.push(...acts);

      if (sprintId !== null && addedAt !== null) {
        sprintIssues.push({
          sprintId,
          issueId: id,
          isOpen: group === 'S2' || group === 'S3',
          addedAfterStart,
          addedAt,
          removedAt: null,
        });
      }

      if (storyPoints !== null) {
        if (inS1) s1Committed += storyPoints;
        if (group === 'S1_DONE') s1Completed += storyPoints;
        if (group === 'S2' && !addedAfterStart) s2Committed += storyPoints;
      }
      if (type === 'STORY') stories.push(id);
      if (type === 'BUG') bugs.push({ id, reporterId, createdAt });
      if ((inS1 || group === 'S2') && !addedAfterStart) commentable.push({ id });
    }

    for (const bug of bugs) {
      const storyId = pick(stories);
      issueLinks.push({
        bugId: bug.id,
        storyId,
        createdBy: bug.reporterId,
        createdAt: new Date(bug.createdAt.getTime() + 600_000),
      });
      bugDetails.push({
        issueId: bug.id,
        environment: pick(ENVIRONMENTS),
        stepsToReproduce: '1. Open the page\n2. Enter the test data\n3. Submit and observe the result',
        expectedResult: 'The action completes and the data is saved correctly.',
        actualResult: 'The page shows an error and the data is not saved.',
        severity: weighted(SEVERITY_WEIGHTS),
      });
    }

    for (let i = 0; i < 12; i++) {
      const target = pick(commentable);
      const createdAt = utc(2026, 10, 12 + Math.floor(rnd() * 20), 3 + Math.floor(rnd() * 12), Math.floor(rnd() * 60));
      comments.push({
        id: commentSeq++,
        issueId: target.id,
        authorId: pick(p.members),
        body: COMMENT_BODIES[i % COMMENT_BODIES.length],
        createdAt,
        editedAt: i % 6 === 0 ? new Date(createdAt.getTime() + 300_000) : null,
      });
    }

    projects.push({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      objectives: p.objectives,
      startDate: utc(2026, 10, 11),
      endDate: utc(2027, 1, 22),
      managerId: p.manager,
      nextIssueNumber: p.issueCount + 1,
      isArchived: false,
      createdAt: utc(2026, 10, 1, 4, 0),
    });

    const sprintMeta: Array<{
      id: bigint;
      status: SprintStatus;
      goal: string;
      committed: number | null;
      completed: number | null;
      startedAt: Date | null;
      closedAt: Date | null;
      createdAt: Date;
    }> = [
      {
        id: s1,
        status: 'CLOSED',
        goal: 'Foundation: accounts, core screens and first working flow.',
        committed: s1Committed,
        completed: s1Completed,
        startedAt: S1_START,
        closedAt: S1_CLOSE,
        createdAt: utc(2026, 10, 5, 10, 0),
      },
      {
        id: s2,
        status: 'ACTIVE',
        goal: 'Core features end to end, ready for QA.',
        committed: s2Committed,
        completed: null,
        startedAt: S2_START,
        closedAt: null,
        createdAt: utc(2026, 10, 20, 10, 0),
      },
      {
        id: s3,
        status: 'PLANNED',
        goal: 'Polish, reports and performance.',
        committed: null,
        completed: null,
        startedAt: null,
        closedAt: null,
        createdAt: utc(2026, 11, 2, 10, 0),
      },
    ];
    sprintMeta.forEach((m, i) => {
      sprints.push({
        id: m.id,
        projectId: p.id,
        name: sprintNames[i],
        goal: m.goal,
        startDate: SPRINT_DATES[i][0],
        endDate: SPRINT_DATES[i][1],
        status: m.status,
        committedPoints: m.committed,
        completedPoints: m.completed,
        startedAt: m.startedAt,
        closedAt: m.closedAt,
      });
      drafts.push(draft(p.id, 'SPRINT', m.id, p.manager, 'CREATED', null, null, null, m.createdAt));
      if (m.startedAt) drafts.push(draft(p.id, 'SPRINT', m.id, p.manager, 'SPRINT_STARTED', null, null, null, m.startedAt));
      if (m.closedAt) drafts.push(draft(p.id, 'SPRINT', m.id, p.manager, 'SPRINT_CLOSED', null, null, null, m.closedAt));
    });
  }

  const activities: ActivityRow[] = drafts
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((d, i) => ({ id: BigInt(i + 1), ...d }));

  return { users, projects, projectMembers, sprints, issues, bugDetails, issueLinks, sprintIssues, comments, activities };
}
