import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/layout/Header'
import { Download, Pencil, Check, ChevronLeft, ChevronRight, Filter, X, Plus, Trash2, Undo2, Loader2, Camera } from 'lucide-react'
import ScheduleSnapshotDialog from '../components/modelSchedule/ScheduleSnapshotDialog'
import clsx from 'clsx'
import { modelScheduleApi } from '../api/modelScheduleApi'
import {
  type BarType,
  type ModelRow,
  type ScheduleBar,
  type StatusType,
  type TestCategory,
  TEST_TYPES,
  STATUS_LIST,
  groupKey,
  prepareModelScheduleRows,
  rowsNeedRepair,
  sortModelRows,
} from '../utils/modelScheduleRows'
import {
  VERIFICATION_MOCK_ROWS,
  VERIFICATION_MOCK_TIMELINE_START,
} from '../data/modelScheduleVerificationMock'

// ── 타입 (utils re-export) ───────────────────────────────────────────────────

// ── 상수 ─────────────────────────────────────────────────────────────────────

const BAR_CONFIG: Record<BarType, { color: string; label: string; textColor: string }> = {
  planned:        { color: '#94A3B8', label: '진행 예정',         textColor: '#fff' },
  inprogress:     { color: '#FACC15', label: '진행중',           textColor: '#78350F' },
  event_ng:       { color: '#EF4444', label: 'Event NG',         textColor: '#fff' },
  event_ok:       { color: '#22C55E', label: 'Event OK',         textColor: '#fff' },
  event_done_est: { color: '#A78BFA', label: 'Event 완료 예상',  textColor: '#fff' },
  su_fota:        { color: '#F97316', label: 'SU/FOTA 배포',     textColor: '#fff' },
}
const BAR_TYPES: BarType[] = ['planned', 'inprogress', 'event_ng', 'event_ok', 'event_done_est', 'su_fota']

const STATUS_STYLE: Record<StatusType, { bg: string; text: string }> = {
  '완료': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '예정': { bg: 'bg-gray-100', text: 'text-gray-500' },
  '검증제외': { bg: 'bg-amber-50', text: 'text-amber-600' },
  '진행중': { bg: 'bg-orange-50', text: 'text-orange-600' },
  'NG': { bg: 'bg-red-100', text: 'text-red-700' },
  '지연': { bg: 'bg-rose-50', text: 'text-rose-600' },
}

function isVerificationMockPreview(search: string): boolean {
  const q = new URLSearchParams(search)
  return q.get('mock') === '1' || q.get('preview') === 'mock'
}

function parseTimelineStart(iso: string | null | undefined): Date {
  if (!iso) return toD('2026-09-15')
  return toD(String(iso).slice(0, 10))
}
const TT_STYLE: Record<TestCategory, string> = {
  '일반성능': 'bg-blue-50 text-blue-600', '호환성': 'bg-purple-50 text-purple-600',
  '안정성': 'bg-amber-50 text-amber-600', '시너지': 'bg-emerald-50 text-emerald-600',
}

// ── Default Mock ─────────────────────────────────────────────────────────────

function makeRows(cat: string, model: string, event: string, variant: string, mfr: string, soc: string, staff1: string, staff2: string, changes: string, status: StatusType, bars0: ScheduleBar[]): ModelRow[] {
  const base = { category: cat, model, event, variant, manufacturer: mfr, soc, changes, status }
  return TEST_TYPES.map((tt, i) => ({
    ...base, id: `${model.replace(/\//g,'')}-${i}-${Date.now()+i}`, staff: i < 2 ? staff1 : staff2, testType: tt,
    bars: i === 0 ? bars0 : [],
  }))
}
const DEFAULT_DATA: ModelRow[] = [
  ...makeRows('사운드바(Wi-Fi)','H7','MR8','MR8/9','Symphony','Q2S','김로경','김승화','SoC LPE 적용','예정',[
    {start:'2026-09-17',end:'2026-09-19',type:'inprogress',label:'DEV'},{start:'2026-09-22',end:'2026-09-24',type:'event_ng',label:'NG'},{start:'2026-09-25',end:'2026-09-26',type:'event_ok',label:'OK'},
  ]),
  ...makeRows('사운드바(Wi-Fi)','W7','MR8','MR8/9','Symphony','MTK532','김승화','김로경','OLED TV 연동','예정',[
    {start:'2026-09-18',end:'2026-09-22',type:'inprogress',label:'검증'},{start:'2026-09-23',end:'2026-09-25',type:'event_ok',label:'OK'},
  ]),
  ...makeRows('사운드바(Wi-Fi)','M7/M5','MR9','MR8/9','Symphony','MTK532','김로경','김승화','MCU 개선','예정',[
    {start:'2026-09-29',end:'2026-10-03',type:'planned'},{start:'2026-10-06',end:'2026-10-08',type:'event_done_est',label:'MR9'},
  ]),
  ...makeRows('사운드바(Wi-Fi)','S80C','FC1','GM.B.HW','Tonly','MLC3763','김로경','김승화','Near Source 추가','완료',[
    {start:'2026-09-22',end:'2026-09-26',type:'event_ok',label:'FC1'},{start:'2026-10-15',end:'2026-10-20',type:'event_done_est',label:'FC2'},
  ]),
  ...makeRows('무선스피커(BT)','Mini','MR8','MR8/9','Worik','BES2710A','김승화','김로경','USB Audio Part','예정',[
    {start:'2026-10-01',end:'2026-10-08',type:'planned'},{start:'2026-10-19',end:'2026-10-22',type:'su_fota',label:'SU배포'},
  ]),
  ...makeRows('파티스피커(BT)','STAGE5301','MR1','MR1/N','Tonly','MLC3725','김승화','김로경','USB Audio Part','검증제외',[
    {start:'2026-09-26',end:'2026-10-03',type:'planned'},
  ]),
]

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function addDays(d:Date,n:number){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function fmt(d:Date){return `${d.getMonth()+1}/${d.getDate()}`}
function diffD(a:Date,b:Date){return Math.round((b.getTime()-a.getTime())/86400000)}
function toD(s:string){return new Date(s+'T00:00:00')}
function dayStart(d:Date){const r=new Date(d);r.setHours(0,0,0,0);return r}
function toISO(d:Date){
  const x=dayStart(d)
  const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
function normDate(s:string){return String(s||'').slice(0,10)}
function barCoversDay(bar:ScheduleBar,d:Date){const dk=toISO(d);return dk>=normDate(bar.start)&&dk<=normDate(bar.end)}
function isBarStartDay(bar:ScheduleBar,d:Date){return toISO(d)===normDate(bar.start)}
function rowBars(row:ModelRow){return Array.isArray(row.bars)?row.bars:[]}

function uniq(data:ModelRow[],f:keyof ModelRow){const s=new Set<string>();data.forEach(r=>{const v=String(r[f]||'').trim();if(v)s.add(v)});return Array.from(s).sort()}

function exportCSV(data:ModelRow[]){
  const h=['카테고리','모델명','이벤트','개발등급','생산업체','SoC','담당','구분','주요 변경점','Status']
  const rows=data.map(r=>[r.category,r.model,r.event,r.variant,r.manufacturer,r.soc,r.staff,r.testType,r.changes.replace(/\n/g,' '),r.status])
  const csv='\uFEFF'+[h,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
  a.download=`모델현황_${new Date().toISOString().slice(0,10)}.csv`;a.click()
}

function isModelAllDone(data:ModelRow[],model:string,cat:string,event:string):boolean{
  const group=data.filter(r=>r.model===model&&r.category===cat&&r.event===event)
  return group.length>0&&group.every(r=>r.status==='완료')
}

// ── 병합 ─────────────────────────────────────────────────────────────────────

interface Merge{rowSpan:number;hidden:boolean}
function calcMerge(rows:ModelRow[],key:(r:ModelRow)=>string):Merge[]{
  const res:Merge[]=rows.map(()=>({rowSpan:1,hidden:false}));let i=0
  while(i<rows.length){const k=key(rows[i]);let j=i+1;while(j<rows.length&&key(rows[j])===k&&k)j++;res[i].rowSpan=j-i;for(let x=i+1;x<j;x++)res[x].hidden=true;i=j}
  return res
}

// ── 바 타입 선택 팝업 ────────────────────────────────────────────────────────

function BarTypePicker({x,y,currentType,currentLabel,onSelect,onRemove,onClose,onApplyLabel}:{
  x:number;y:number;currentType:BarType|null;currentLabel:string
  onSelect:(t:BarType,label:string)=>void;onRemove:()=>void;onClose:()=>void;onApplyLabel:(l:string)=>void
}){
  const [label,setLabel]=useState(currentLabel)
  const inputRef=useRef<HTMLInputElement>(null)
  useEffect(()=>{setLabel(currentLabel)},[currentLabel])
  const readLabel=()=>(inputRef.current?.value??label).trim()
  return(
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose}/>
      <div className="fixed z-50 bg-white border border-surface-border rounded-lg shadow-xl py-1 w-40"
        style={{left:Math.min(x,window.innerWidth-170),top:Math.min(y,window.innerHeight-320)}}
        onMouseDown={e=>e.stopPropagation()}>
        {BAR_TYPES.map(t=>(
          <button key={t} type="button" onMouseDown={e=>e.stopPropagation()} onClick={()=>onSelect(t,readLabel())} className={clsx('w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-surface-page text-left',currentType===t&&'bg-blue-50 font-semibold')}>
            <div className="w-4 h-3 rounded-sm shrink-0" style={{backgroundColor:BAR_CONFIG[t].color}}/>{BAR_CONFIG[t].label}
          </button>
        ))}
        <div className="border-t border-surface-border my-1"/>
        <div className="px-3 py-1.5">
          <p className="text-[9px] text-gray-400 mb-1">라벨 (블록 위 글자)</p>
          <input ref={inputRef} className="w-full px-2 py-1 border border-gray-300 rounded text-[11px]" value={label} placeholder="예: FC1, MR8..."
            onChange={e=>setLabel(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){onApplyLabel(readLabel());onClose()}}} autoFocus/>
          <button type="button" onMouseDown={e=>e.stopPropagation()} onClick={()=>{onApplyLabel(readLabel());onClose()}} className="mt-1 w-full text-center text-[10px] text-blue-600 hover:underline">적용</button>
        </div>
        <div className="border-t border-surface-border my-1"/>
        <button type="button" onMouseDown={e=>e.stopPropagation()} onClick={onRemove} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-red-50 text-red-500 text-left"><X size={12}/>삭제</button>
      </div>
    </>
  )
}

// ── 주요변경점 팝업 편집 ─────────────────────────────────────────────────────

function ChangesPopup({value,onSave,onClose}:{value:string;onSave:(v:string)=>void;onClose:()=>void}){
  const [text,setText]=useState(value)
  return(
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose}/>
      <div className="fixed z-50 bg-white border border-surface-border rounded-xl shadow-2xl p-4 w-96" style={{left:'50%',top:'50%',transform:'translate(-50%,-50%)'}}>
        <p className="text-sm font-semibold text-gray-800 mb-2">주요 변경점 편집</p>
        <textarea className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-400" value={text}
          onChange={e=>setText(e.target.value)} autoFocus placeholder="변경점 내용을 입력하세요..."/>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-300 hover:bg-gray-50">취소</button>
          <button onClick={()=>{onSave(text);onClose()}} className="px-3 py-1.5 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500">저장</button>
        </div>
      </div>
    </>
  )
}

// ── 인라인 Input (Enter 확정) ────────────────────────────────────────────────

function EI({value,onChange}:{value:string;onChange:(v:string)=>void}){
  const [local,setLocal]=useState(value)
  useEffect(()=>{setLocal(value)},[value])
  const commit=()=>{if(local!==value)onChange(local)}
  return <input className="w-full px-1 py-0.5 border border-gray-300 rounded text-[10px] bg-white" value={local}
    onChange={e=>setLocal(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){commit();(e.target as HTMLInputElement).blur()}}}/>
}

// ── 페이지 ───────────────────────────────────────────────────────────────────

const DAYS=42,CW=28,RH=28

export default function ModelSchedulePage(){
  const location=useLocation()
  const mockPreview=isVerificationMockPreview(location.search)
  const [data,setData]=useState<ModelRow[]>(()=>
    mockPreview?prepareModelScheduleRows(VERIFICATION_MOCK_ROWS):prepareModelScheduleRows(DEFAULT_DATA),
  )
  const [snapshot,setSnapshot]=useState<ModelRow[]|null>(null)
  const [editing,setEditing]=useState(false)
  const [saving,setSaving]=useState(false)
  const [loading,setLoading]=useState(true)
  const [saveMessage,setSaveMessage]=useState<{type:'success'|'warn';text:string}|null>(null)
  const [dataSource,setDataSource]=useState<'mongo'|'local'|'default'>('default')
  const [startDate,setStartDate]=useState(()=>
    mockPreview?parseTimelineStart(VERIFICATION_MOCK_TIMELINE_START):toD('2026-09-15'),
  )
  const scrollRef=useRef<HTMLDivElement>(null)
  const [fCat,setFCat]=useState('');const [fModel,setFModel]=useState('');const [fStatus,setFStatus]=useState('')
  const [picker,setPicker]=useState<{rowId:string;date:string;x:number;y:number;currentType:BarType|null;currentLabel:string}|null>(null)
  const [changesPopup,setChangesPopup]=useState<{model:string;cat:string;event:string}|null>(null)
  const [showSnapshotPopup,setShowSnapshotPopup]=useState(false)

  // MongoDB / localStorage 로드 (페이지 진입 시마다)
  useEffect(()=>{
    if(mockPreview){
      setData(prepareModelScheduleRows(VERIFICATION_MOCK_ROWS))
      setStartDate(parseTimelineStart(VERIFICATION_MOCK_TIMELINE_START))
      setDataSource('default')
      setLoading(false)
      return
    }
    let cancelled=false
    setLoading(true)
    modelScheduleApi.load()
      .then(async res=>{
        if(cancelled)return
        if(res.rows.length>0){
          const prepared=prepareModelScheduleRows(res.rows)
          setData(prepared)
          setDataSource(res.source)
          if(rowsNeedRepair(res.rows)){
            try{
              const saved=await modelScheduleApi.save(prepared)
              if(!cancelled)setDataSource(saved.source)
            }catch{/* ignore */}
          }
        }else{
          setDataSource(res.source)
        }
      })
      .finally(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true}
  },[location.pathname, location.search, mockPreview])

  const hasFilter=!!(fCat||fModel||fStatus)
  const sortedData=useMemo(()=>sortModelRows(data),[data])
  const filtered=useMemo(()=>sortedData.filter(r=>(!fCat||r.category===fCat)&&(!fModel||r.model===fModel)&&(!fStatus||r.status===fStatus)),[sortedData,fCat,fModel,fStatus])
  const catMerge=useMemo(()=>calcMerge(filtered,r=>r.category),[filtered])
  const modelMerge=useMemo(()=>calcMerge(filtered,groupKey),[filtered])

  const today=dayStart(new Date())
  const dates=useMemo(()=>Array.from({length:DAYS},(_,i)=>dayStart(addDays(startDate,i))),[startDate])
  const todayOff=useMemo(()=>diffD(startDate,today),[startDate,today])

  const isModelLast=useCallback((ri:number)=>{
    if(ri>=filtered.length-1)return true
    return groupKey(filtered[ri])!==groupKey(filtered[ri+1])
  },[filtered])

  const startEdit=()=>{setSnapshot(JSON.parse(JSON.stringify(data)));setEditing(true)}
  const cancelEdit=()=>{if(snapshot)setData(snapshot);setSnapshot(null);setEditing(false);setPicker(null)}
  const finishEdit=async()=>{
    setEditing(false);setPicker(null);setSnapshot(null)
    if(mockPreview){
      setSaveMessage({type:'warn',text:'Mock 모드 — MongoDB 저장 안 함'})
      return
    }
    setSaving(true);setSaveMessage(null)
    try{
      const res=await modelScheduleApi.save(sortModelRows(data))
      setDataSource(res.source)
      setSaveMessage({
        type:res.source==='mongo'?'success':'warn',
        text:res.source==='mongo'?'저장되었습니다.':res.message,
      })
    }catch(e){
      console.warn('Save failed:',e)
      setSaveMessage({type:'warn',text:'저장에 실패했습니다.'})
    }finally{setSaving(false)}
  }

  const updateField=(id:string,f:keyof ModelRow,v:string)=>setData(p=>p.map(r=>r.id===id?{...r,[f]:v}:r))
  const updateGroup=(m:string,c:string,e:string,f:keyof ModelRow,v:string)=>setData(p=>p.map(r=>r.model===m&&r.category===c&&r.event===e?{...r,[f]:v}:r))

  const addModel=()=>{
    const ts=Date.now()
    setData(p=>[...p,...TEST_TYPES.map((tt,i)=>({
      id:`new-${ts}-${i}`,category:'',model:'새 모델',event:'',variant:'',manufacturer:'',soc:'',
      staff:'',testType:tt,changes:'',status:'예정' as StatusType,bars:[],
    }))])
  }
  const deleteModel=(m:string,c:string,e:string)=>setData(p=>p.filter(r=>!(r.model===m&&r.category===c&&r.event===e)))

  const handleCellClick=(e:React.MouseEvent,rowId:string,date:Date)=>{
    if(!editing)return
    e.stopPropagation()
    const row=data.find(r=>r.id===rowId);const ds=toISO(date)
    const bar=row?rowBars(row).find(b=>ds>=normDate(b.start)&&ds<=normDate(b.end)):undefined
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect()
    setPicker({rowId,date:ds,x:rect.left,y:rect.bottom+2,currentType:bar?.type??null,currentLabel:bar?.label||''})
  }
  const upsertBarAtPicker=(type:BarType,label:string)=>{
    setPicker(current=>{
      if(!current)return null
      const snap=current
      setData(p=>p.map(r=>{
        if(r.id!==snap.rowId)return r
        const bars=[...rowBars(r)]
        const ei=bars.findIndex(b=>snap.date>=normDate(b.start)&&snap.date<=normDate(b.end))
        if(ei>=0){
          bars[ei]={...bars[ei],type,label:label!==''?label:(bars[ei].label||'')}
        }else{
          bars.push({start:snap.date,end:snap.date,type,label})
        }
        return{...r,bars}
      }))
      return{...snap,currentType:type,currentLabel:label}
    })
  }
  const applyBarType=(type:BarType,label:string)=>{upsertBarAtPicker(type,label)}
  const applyBarLabel=(label:string)=>{
    setPicker(current=>{
      if(!current)return null
      const snap=current
      if(snap.currentType){
        setData(p=>p.map(r=>{
          if(r.id!==snap.rowId)return r
          const bars=[...rowBars(r)]
          const ei=bars.findIndex(b=>snap.date>=normDate(b.start)&&snap.date<=normDate(b.end))
          if(ei>=0){
            bars[ei]={...bars[ei],type:snap.currentType!,label}
          }else{
            bars.push({start:snap.date,end:snap.date,type:snap.currentType!,label})
          }
          return{...r,bars}
        }))
        return{...snap,currentLabel:label}
      }
      setData(p=>p.map(r=>{
        if(r.id!==snap.rowId)return r
        const bars=[...rowBars(r)]
        const ei=bars.findIndex(b=>snap.date>=normDate(b.start)&&snap.date<=normDate(b.end))
        if(ei<0)return r
        bars[ei]={...bars[ei],label}
        return{...r,bars}
      }))
      return{...snap,currentLabel:label}
    })
  }
  const removeBar=()=>{
    setPicker(current=>{
      if(!current)return null
      const snap=current
      setData(p=>p.map(r=>{
        if(r.id!==snap.rowId)return r
        return{...r,bars:rowBars(r).filter(b=>!(snap.date>=normDate(b.start)&&snap.date<=normDate(b.end)))}
      }))
      return null
    })
  }

  const MergedCell=({ri,children,className=''}:{ri:number;children:React.ReactNode;className?:string})=>{
    if(modelMerge[ri].hidden)return null
    const allDone=isModelAllDone(data,filtered[ri].model,filtered[ri].category,filtered[ri].event)
    return <td rowSpan={modelMerge[ri].rowSpan} className={clsx('border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap align-middle',allDone&&'bg-gray-100',className)}>{children}</td>
  }

  if(loading)return(<><Header title="모델 검증 일정 상세" subtitle="로딩 중..."/><div className="pt-16 p-6 flex justify-center items-center h-40"><Loader2 size={24} className="animate-spin text-gray-400"/></div></>)

  return(
    <>
      <Header
        title="모델 검증 일정 상세"
        subtitle={
          mockPreview
            ? 'Mock 미리보기 · Excel(openpyxl) import JSON (DB 미반영)'
            : '모델별 개발/검증 일정 Gantt — 편집 · 엑셀 · MongoDB'
        }
      />
      <div className="pt-16 p-4">
        {mockPreview && (
          <p className="text-[11px] text-blue-900 mb-2 bg-blue-50 border border-blue-300 rounded-lg px-3 py-2 font-medium">
            Excel → JSON mock —{' '}
            <code className="text-[10px] bg-white px-1 rounded">?mock=1</code> · 갱신:{' '}
            <code className="text-[10px] bg-white px-1 rounded">sh scripts/sync-verification-schedule-from-xlsx.sh</code>
          </p>
        )}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={()=>setStartDate(p=>addDays(p,-7))} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronLeft size={16}/></button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">{fmt(startDate)} ~ {fmt(addDays(startDate,DAYS-1))}</span>
          <button onClick={()=>setStartDate(p=>addDays(p,7))} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronRight size={16}/></button>
          <div className="w-px h-6 bg-gray-200 mx-1"/>
          <div className="flex items-center gap-3 flex-wrap text-[10px] font-medium">
            {Object.entries(BAR_CONFIG).map(([k,c])=>(<div key={k} className="flex items-center gap-1"><div className="w-4 h-2.5 rounded-sm" style={{backgroundColor:c.color}}/><span className="text-gray-600">{c.label}</span></div>))}
          </div>
          <div className="flex-1"/>
          {saving&&<span className="text-[10px] text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/>저장 중...</span>}
          {!saving&&saveMessage&&(
            <span className={clsx('text-[10px] font-medium',saveMessage.type==='success'?'text-emerald-600':'text-amber-600')}>{saveMessage.text}</span>
          )}
          {!saving&&!saveMessage&&dataSource!=='default'&&(
            <span className="text-[10px] text-gray-400">{dataSource==='mongo'?'MongoDB':'브라우저'}에서 불러옴</span>
          )}
          {editing&&<button onClick={addModel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200"><Plus size={14}/>모델 추가</button>}
          {editing?(
            <>
              <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 border border-gray-300"><Undo2 size={14}/>취소</button>
              <button onClick={finishEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-300"><Check size={14}/>편집 완료</button>
            </>
          ):(
            <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page"><Pencil size={14}/>Edit</button>
          )}
          <button onClick={()=>setShowSnapshotPopup(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page"><Camera size={14}/>Snapshot</button>
          <button onClick={()=>exportCSV(filtered)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page"><Download size={14}/>엑셀</button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400"/>
          {([['카테고리',fCat,setFCat,'category'],['모델명',fModel,setFModel,'model'],['Status',fStatus,setFStatus,'status']] as const).map(([l,v,s,f])=>(
            <select key={f} value={v} onChange={e=>s(e.target.value)} className={clsx('text-[10px] px-1.5 py-1 rounded border bg-white cursor-pointer',v?'border-lg-red text-lg-red font-bold':'border-gray-200 text-gray-500')}>
              <option value="">{l} ▾</option>{uniq(sortedData,f).map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {hasFilter&&<button onClick={()=>{setFCat('');setFModel('');setFStatus('')}} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-red-500 hover:bg-red-50"><X size={10}/>초기화</button>}
          <span className="text-[10px] text-gray-400 ml-auto">{filtered.length}/{sortedData.length}건</span>
        </div>

        {editing&&<div className="text-[10px] text-gray-500 mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">💡 일정 셀 <b>클릭</b> → 타입+라벨 · <b>변경점</b> 클릭 → 팝업 편집 · <b>취소</b> = 복원 · <b>편집 완료</b> = MongoDB 저장</div>}

        <div className="border border-surface-border rounded-xl bg-white">
          <div className="overflow-x-auto" ref={scrollRef}>
            <table className="text-xs border-collapse" style={{minWidth:`${720+DAYS*CW}px`,overflow:'visible'}}>
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  {['카테고리','모델명','이벤트','개발등급','생산업체','SoC','담당','구분','주요 변경점','Status'].map((h,i)=>(
                    <th key={i} className={clsx('border-r border-surface-border px-1.5 py-2 text-gray-500 font-semibold text-[10px] whitespace-nowrap',
                      i===0&&'sticky left-0 z-10 bg-gray-50 w-20',i===1&&'sticky left-20 z-10 bg-gray-50 w-16',
                      i===8&&'min-w-[140px]'
                    )}>{h}</th>
                  ))}
                  {editing&&<th className="border-r border-surface-border px-1 py-2 text-gray-400 text-[9px] w-8">삭제</th>}
                  {dates.map((d,i)=>(
                    <th key={i} className={clsx('border-r border-surface-border px-0 py-1 text-center font-medium',
                      d.getTime()===today.getTime()?'bg-red-100 text-red-700':(d.getDay()===0||d.getDay()===6)?'bg-gray-100 text-gray-400':'text-gray-500',
                      d.getDay()===1&&'border-l-2 border-l-gray-300'
                    )} style={{width:CW,minWidth:CW}}>
                      <div className="text-[8px] leading-tight">{fmt(d)}</div>
                      <div className="text-[7px] text-gray-400">{['일','월','화','수','목','금','토'][d.getDay()]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row,ri)=>{
                  const cm=catMerge[ri];const mm=modelMerge[ri]
                  const borderB=isModelLast(ri)?'border-b-2 border-b-gray-400':'border-b border-b-surface-border/60'
                  const allDone=isModelAllDone(data,row.model,row.category,row.event)
                  const doneBg=allDone?'bg-gray-100':''

                  return(
                    <tr key={row.id} className={clsx('hover:bg-gray-50/30',borderB)} style={{height:RH}}>
                      {!cm.hidden&&<td rowSpan={cm.rowSpan} className={clsx('sticky left-0 z-10 bg-white border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap align-middle',allDone&&'bg-gray-100')}>
                        {editing?<EI value={row.category} onChange={v=>updateGroup(row.model,row.category,row.event,'category',v)}/>:row.category}
                      </td>}
                      {!mm.hidden&&<td rowSpan={mm.rowSpan} className={clsx('sticky left-20 z-10 bg-white border-r border-surface-border px-1.5 text-gray-900 font-semibold text-[11px] whitespace-nowrap align-middle text-center',allDone&&'bg-gray-100')}>
                        {editing?<EI value={row.model} onChange={v=>{const om=row.model;const oc=row.category;const oe=row.event;setData(p=>p.map(r=>r.model===om&&r.category===oc&&r.event===oe?{...r,model:v}:r))}}/>:row.model}
                      </td>}
                      <MergedCell ri={ri}>{editing?<EI value={row.event} onChange={v=>updateGroup(row.model,row.category,row.event,'event',v)}/>:<span className="text-gray-600">{row.event}</span>}</MergedCell>
                      <MergedCell ri={ri}>{editing?<EI value={row.variant} onChange={v=>updateGroup(row.model,row.category,row.event,'variant',v)}/>:<span className="text-gray-600">{row.variant}</span>}</MergedCell>
                      <MergedCell ri={ri}>{editing?<EI value={row.manufacturer} onChange={v=>updateGroup(row.model,row.category,row.event,'manufacturer',v)}/>:<span className="text-gray-600">{row.manufacturer}</span>}</MergedCell>
                      <MergedCell ri={ri}>{editing?<EI value={row.soc} onChange={v=>updateGroup(row.model,row.category,row.event,'soc',v)}/>:<span className="text-gray-600 font-mono">{row.soc}</span>}</MergedCell>
                      <MergedCell ri={ri}>{editing?<EI value={row.staff} onChange={v=>updateField(row.id,'staff',v)}/>:<span className="text-gray-600">{row.staff}</span>}</MergedCell>
                      <td className="border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap">
                        <span className={clsx('px-1 py-0.5 rounded text-[9px] font-bold',TT_STYLE[row.testType])}>{row.testType}</span>
                      </td>
                      {/* 주요 변경점 — 툴팁 + 팝업 편집 */}
                      <MergedCell ri={ri} className="min-w-[140px]">
                        {editing?(
                          <button onClick={()=>setChangesPopup({model:row.model,cat:row.category,event:row.event})} className="w-full text-left text-[9px] text-blue-600 hover:underline truncate px-1 py-0.5 border border-dashed border-gray-300 rounded">
                            {row.changes||'클릭하여 편집...'}
                          </button>
                        ):(
                          <div className="group relative">
                            <span className="text-gray-500 text-[9px] truncate block max-w-[130px]">{row.changes}</span>
                            {row.changes&&<div className="hidden group-hover:block absolute z-30 left-0 top-full mt-1 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-xl max-w-xs whitespace-pre-wrap">{row.changes}</div>}
                          </div>
                        )}
                      </MergedCell>
                      <td className="border-r border-surface-border px-1.5">
                        {editing?(
                          <select value={row.status} onChange={e=>updateField(row.id,'status',e.target.value)} className="text-[9px] px-1 py-0.5 border border-gray-300 rounded bg-white">
                            {STATUS_LIST.map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                        ):(()=>{const s=STATUS_STYLE[row.status];return<span className={`px-1 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>{row.status}</span>})()}
                      </td>
                      {editing&&<td className="border-r border-surface-border px-1 text-center">
                        {row.testType==='일반성능'&&<button onClick={()=>deleteModel(row.model,row.category,row.event)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>}
                      </td>}

                      {dates.map((d,di)=>{
                        const isW=d.getDay()===0||d.getDay()===6
                        const bars=rowBars(row)
                        const bar=bars.find(b=>barCoversDay(b,d))
                        const isBS=bar&&isBarStartDay(bar,d)
                        const bc=bar?BAR_CONFIG[bar.type]:null
                        const barSpanDays=bar?diffD(toD(normDate(bar.start)),toD(normDate(bar.end)))+1:0
                        const barMinW=barSpanDays*CW-2
                        const barW=bar?.label
                          ? Math.max(barMinW,bar.label.length*7+10)
                          : barMinW

                        return(
                          <td key={di} className={clsx('border-r border-surface-border/40 px-0 py-0 relative overflow-visible',
                            isW&&'bg-gray-50/50',d.getDay()===1&&'border-l-2 border-l-gray-200',
                            editing&&'cursor-pointer hover:bg-blue-50/40'
                          )} style={{width:CW,minWidth:CW,height:RH,overflow:'visible'}}
                            onClick={editing?(e)=>handleCellClick(e,row.id,d):undefined}
                          >
                            {bar&&bc&&isBS&&(
                              <div className="absolute top-1 left-0 rounded-sm flex items-center z-[5] pointer-events-none overflow-visible"
                                style={{width:`${barW}px`,minWidth:`${barMinW}px`,height:RH-8,backgroundColor:bc.color}}>
                                {bar.label?(
                                  <span className="px-1 text-[8px] font-bold leading-none whitespace-nowrap overflow-visible"
                                    style={{color:bc.textColor}}>
                                    {bar.label}
                                  </span>
                                ):null}
                              </div>
                            )}
                            {bar&&bc&&!isBS&&(
                              <div className="absolute inset-y-1 inset-x-0 rounded-sm pointer-events-none" style={{backgroundColor:bc.color}}/>
                            )}
                            {di===todayOff&&<div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-600 z-20 pointer-events-none" style={{transform:'translateX(-50%)'}}/>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-right">빨간 세로선 = 오늘 ({fmt(today)})</p>
      </div>

      {picker&&<BarTypePicker x={picker.x} y={picker.y} currentType={picker.currentType} currentLabel={picker.currentLabel} onSelect={applyBarType} onRemove={removeBar} onClose={()=>setPicker(null)} onApplyLabel={applyBarLabel}/>}
      {changesPopup&&<ChangesPopup value={data.find(r=>r.model===changesPopup.model&&r.category===changesPopup.cat&&r.event===changesPopup.event)?.changes||''} onSave={v=>updateGroup(changesPopup.model,changesPopup.cat,changesPopup.event,'changes',v)} onClose={()=>setChangesPopup(null)}/>}
      <ScheduleSnapshotDialog
        open={showSnapshotPopup}
        onClose={()=>setShowSnapshotPopup(false)}
        rows={filtered}
        allRows={filtered}
        dates={dates}
        periodLabel={`${fmt(startDate)} ~ ${fmt(addDays(startDate,DAYS-1))}`}
        today={today}
        startDate={startDate}
      />
    </>
  )
}
