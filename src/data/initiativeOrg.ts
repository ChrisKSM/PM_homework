import type { DirectoryUser } from './initiativeTemplate'

/** `GET /rps/organization` — { 팀명: { ep-id: [이름, 직급, 팀명, 이메일, 사번] } } */
export type RpsOrganizationResponse = Record<string, Record<string, string[]>>

export interface TeamPartMember {
  ep_id?: string
  email?: string
  name?: string
}

/** `GET /mongodb/team_organizations/{팀명}` */
export interface TeamOrganization {
  parts: Record<string, TeamPartMember[]>
  team_staff: TeamPartMember[]
}

export interface OrgMember {
  id: string
  /** Jira username = 이메일 prefix */
  jiraId: string
  displayName: string
  email: string
  title: string
  team: string
}

export interface OrgTeam {
  name: string
  members: OrgMember[]
}

export const PART_STAFF = '__staff__'

export function parseOrganization(data: RpsOrganizationResponse): OrgTeam[] {
  return Object.entries(data)
    .map(([teamName, members]) => ({
      name: teamName,
      members: Object.entries(members).map(([epId, info]) => {
        const email = Array.isArray(info) ? info[3] ?? '' : ''
        return {
          id: epId,
          jiraId: email ? email.split('@')[0] : epId.replace(/-/g, '.'),
          displayName: Array.isArray(info) ? info[0] ?? '' : '',
          title: Array.isArray(info) ? info[1] ?? '' : '',
          email,
          team: teamName,
        }
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function partMemberId(m: TeamPartMember): string {
  return m.ep_id || (m.email ? m.email.split('@')[0] : '')
}

/** 파트 미선택이면 팀 전체, 선택 시 해당 파트(또는 팀 스태프) 멤버만 — 이름순 */
export function teamMembers(team: OrgTeam, partData: TeamOrganization | undefined, part: string): OrgMember[] {
  let members = team.members
  if (partData && part) {
    const ids = new Set((part === PART_STAFF ? partData.team_staff : partData.parts[part] ?? []).map(partMemberId))
    members = team.members.filter((m) => ids.has(m.jiraId))
  }
  return [...members].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'))
}

export function partOfMember(partData: TeamOrganization | undefined, jiraId: string): string | null {
  if (!partData) return null
  for (const [part, list] of Object.entries(partData.parts)) {
    if (list.some((m) => partMemberId(m) === jiraId)) return part
  }
  return partData.team_staff.some((m) => partMemberId(m) === jiraId) ? '팀 스태프' : null
}

export const MOCK_RPS_ORGANIZATION: RpsOrganizationResponse = {
  'Audio SW PM': {
    'seokmin-koh': ['고석민', '책임', 'Audio SW PM', 'seokmin.koh@lge.com', '10001'],
    'minji-park': ['박민지', '선임', 'Audio SW PM', 'minji.park@lge.com', '10002'],
  },
  'Soundbar SW개발': {
    'hongsoon-lee': ['이홍순', '책임', 'Soundbar SW개발', 'hongsoon.lee@lge.com', '10011'],
    'dohyun-kang': ['강도현', '연구원', 'Soundbar SW개발', 'dohyun.kang@lge.com', '10012'],
    'jaewon-choi': ['최재원', '선임', 'Soundbar SW개발', 'jaewon.choi@lge.com', '10013'],
    'sora-han': ['한소라', '선임', 'Soundbar SW개발', 'sora.han@lge.com', '10014'],
    'minsu-yoon': ['윤민수', '책임', 'Soundbar SW개발', 'minsu.yoon@lge.com', '10015'],
  },
  'webOS PO': {
    'inhoon-kim': ['김인훈', '책임', 'webOS PO', 'inhoon.kim@lge.com', '10021'],
  },
  'webOS PMO': {
    'gold-keum': ['금정현', '책임', 'webOS PMO', 'gold.keum@lge.com', '10031'],
    'kyungdug-hong': ['홍경덕', '선임', 'webOS PMO', 'kyungdug.hong@lge.com', '10032'],
  },
  'TV QE': {
    'yanghee-kim': ['김양희', '책임', 'TV QE', 'yanghee.kim@lge.com', '10041'],
  },
}

export const MOCK_TEAM_ORGANIZATIONS: Record<string, TeamOrganization> = {
  'Soundbar SW개발': {
    parts: {
      HAL파트: [{ ep_id: 'hongsoon.lee' }, { ep_id: 'dohyun.kang' }],
      App파트: [{ ep_id: 'jaewon.choi' }, { email: 'sora.han@lge.com' }],
    },
    team_staff: [{ ep_id: 'minsu.yoon' }],
  },
}

/** Owner 자동 추천 근거 (담당 Component prefix) — BE 연동 시 Component lead / 이력 기반으로 대체 */
const COMPONENT_OWNERS: Record<string, string[]> = {
  'seokmin.koh': ['APP.SOUND', 'audio'],
  'hongsoon.lee': ['soundbar', 'audio-hal'],
  'jaewon.choi': ['APP.SOUNDBAR'],
  'gold.keum': ['SERVER.PMO'],
  'yanghee.kim': ['qe'],
  'kyungdug.hong': ['davis'],
}

export const MOCK_ORG_TEAMS = parseOrganization(MOCK_RPS_ORGANIZATION)

export const MOCK_DIRECTORY: DirectoryUser[] = MOCK_ORG_TEAMS.flatMap((t) =>
  t.members.map((m) => ({ name: m.jiraId, displayName: m.displayName, team: t.name, components: COMPONENT_OWNERS[m.jiraId] ?? [] }))
)

const byId = (id: string) => MOCK_DIRECTORY.find((u) => u.name === id) ?? MOCK_DIRECTORY[0]

export const MOCK_CURRENT_USER = byId('seokmin.koh')
export const MOCK_DEFAULT_PO = byId('inhoon.kim')
