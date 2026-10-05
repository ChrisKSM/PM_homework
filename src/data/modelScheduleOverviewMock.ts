import type { OverviewModel } from '../types/modelScheduleOverview'

/** overview-schedule-rows.json import (병합 셀 fill-down 규칙) */
export const OVERVIEW_MOCK_MODELS: OverviewModel[] = [
  {
    "id": "ov-h7-vi",
    "category": "Sound Suite",
    "model": "H7_VI",
    "variant": "JDM B_HW",
    "manufacturer": "",
    "soc": "ax26sb",
    "hwPm": "",
    "swPo": "",
    "swPm": "조성연",
    "spec": "500W, 5.1.3 \n(9.1.6 Spatial)\nDolby Atmos, DAFC",
    "pv": "2026/11/30",
    "mp": "2026/12/14",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-08-13",
        "end": "2026-08-21",
        "kind": "hw"
      },
      {
        "name": "S I T1",
        "start": "2026-08-13",
        "end": "2026-08-21",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-09-11",
        "end": "2026-09-18",
        "kind": "hw"
      },
      {
        "name": "S I T2",
        "start": "2026-09-11",
        "end": "2026-09-18",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-09-29",
        "end": "2026-10-08",
        "kind": "hw"
      },
      {
        "name": "S I T3",
        "start": "2026-09-29",
        "end": "2026-10-08",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2026-12-14",
        "end": "2026-12-14",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-10-15",
        "end": "2026-10-23",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2026-10-30",
        "end": "2026-11-06",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-10-30",
        "end": "2026-11-06",
        "kind": "sw"
      },
      {
        "name": "FC 3",
        "start": "2026-11-12",
        "end": "2026-11-16",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-11-19",
        "end": "2026-11-27",
        "kind": "sw"
      },
      {
        "name": "QP 2",
        "start": "2026-12-07",
        "end": "2026-12-11",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-h5",
    "category": "Sound Suite",
    "model": "H5",
    "variant": "JDM Ca_HW",
    "manufacturer": "",
    "soc": "ax26sb",
    "hwPm": "",
    "swPo": "",
    "swPm": "조성연",
    "spec": "300W, 3.1.3\n(7.1.5 Spatial Audio)\nDolby Atmos, DAFC",
    "pv": "2026/12/30",
    "mp": "2027/1/11",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-21",
        "end": "2026-10-28",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-10-21",
        "end": "2026-10-28",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-11-06",
        "end": "2026-11-12",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-11-06",
        "end": "2026-11-12",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-11-20",
        "end": "2026-11-24",
        "kind": "hw"
      },
      {
        "name": "FC 3",
        "start": "2026-11-20",
        "end": "2026-11-24",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2027-01-11",
        "end": "2027-01-11",
        "kind": "hw"
      },
      {
        "name": "QP 1",
        "start": "2026-12-03",
        "end": "2026-12-11",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2026-12-21",
        "end": "2026-12-23",
        "kind": "hw"
      },
      {
        "name": "QP 2",
        "start": "2026-12-21",
        "end": "2026-12-23",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-m7-vi",
    "category": "Sound Suite",
    "model": "M7_VI",
    "variant": "JDM B_HW",
    "manufacturer": "",
    "soc": "ax26sb",
    "hwPm": "",
    "swPo": "",
    "swPm": "박윤규/이마을",
    "spec": "100W, \n2.1.1, \nDAFC",
    "pv": "2027/2/16",
    "mp": "2027/2/28",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-12",
        "end": "2026-10-16",
        "kind": "hw"
      },
      {
        "name": "SIT 1",
        "start": "2026-10-12",
        "end": "2026-10-16",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-10-21",
        "end": "2026-10-23",
        "kind": "hw"
      },
      {
        "name": "SIT 2",
        "start": "2026-10-21",
        "end": "2026-10-23",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-11-02",
        "end": "2026-11-10",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-11-02",
        "end": "2026-11-10",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2027-02-28",
        "end": "2027-02-28",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-11-18",
        "end": "2026-11-24",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2026-12-02",
        "end": "2026-12-04",
        "kind": "hw"
      },
      {
        "name": "FC 3",
        "start": "2026-12-02",
        "end": "2026-12-04",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-12-14",
        "end": "2026-12-28",
        "kind": "sw"
      },
      {
        "name": "QP 2",
        "start": "2027-01-06",
        "end": "2027-01-13",
        "kind": "sw"
      },
      {
        "name": "QP 3",
        "start": "2027-01-21",
        "end": "2027-01-27",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-m5-vi",
    "category": "Sound Suite",
    "model": "M5_VI",
    "variant": "JDM Ca_HW",
    "manufacturer": "",
    "soc": "ax26sb",
    "hwPm": "",
    "swPo": "",
    "swPm": "박윤규/이마을",
    "spec": "60W, 1.1.1, DAFC",
    "pv": "-",
    "mp": "2027/2/28",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-12",
        "end": "2026-10-16",
        "kind": "hw"
      },
      {
        "name": "SIT 1",
        "start": "2026-10-12",
        "end": "2026-10-16",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-10-21",
        "end": "2026-10-23",
        "kind": "hw"
      },
      {
        "name": "SIT 2",
        "start": "2026-10-21",
        "end": "2026-10-23",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-11-02",
        "end": "2026-11-10",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-11-02",
        "end": "2026-11-10",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2027-02-28",
        "end": "2027-02-28",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-11-18",
        "end": "2026-11-24",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2026-12-02",
        "end": "2026-12-04",
        "kind": "hw"
      },
      {
        "name": "FC 3",
        "start": "2026-12-02",
        "end": "2026-12-04",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-12-14",
        "end": "2026-12-28",
        "kind": "sw"
      },
      {
        "name": "QP 2",
        "start": "2027-01-06",
        "end": "2027-01-13",
        "kind": "sw"
      },
      {
        "name": "QP 3",
        "start": "2027-01-21",
        "end": "2027-01-27",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-w5",
    "category": "Sound Suite",
    "model": "W5",
    "variant": "JDM Ca_HW",
    "manufacturer": "",
    "soc": "BL618M",
    "hwPm": "",
    "swPo": "",
    "swPm": "조용승",
    "spec": "120W+120W\n서브우퍼",
    "pv": "2027/1/10",
    "mp": "2027/2/28",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-12",
        "end": "2026-10-16",
        "kind": "hw"
      },
      {
        "name": "Dev Test",
        "start": "2026-10-12",
        "end": "2026-10-16",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-10-21",
        "end": "2026-10-23",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-10-21",
        "end": "2026-10-23",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-11-02",
        "end": "2026-11-10",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-11-02",
        "end": "2026-11-10",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2027-02-28",
        "end": "2027-02-28",
        "kind": "hw"
      },
      {
        "name": "QP 1",
        "start": "2026-11-18",
        "end": "2026-11-24",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2026-12-02",
        "end": "2026-12-04",
        "kind": "hw"
      },
      {
        "name": "QP 2",
        "start": "2026-12-02",
        "end": "2026-12-04",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-h7-mr10-11",
    "category": "Sound Suite",
    "model": "H7 MR10(11월)",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "MT8532",
    "hwPm": "",
    "swPo": "",
    "swPm": "이홍순",
    "spec": "500W, 5.1.3 \n(9.1.6 Spatial)\nDolby Atmos, DAFC",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "PreQP1",
        "start": "2026-11-04",
        "end": "2026-11-09",
        "kind": "sw"
      },
      {
        "name": "PreQP2",
        "start": "2026-11-11",
        "end": "2026-11-13",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-11-17",
        "end": "2026-11-20",
        "kind": "sw"
      },
      {
        "name": "QP 2",
        "start": "2026-11-24",
        "end": "2026-11-26",
        "kind": "sw"
      },
      {
        "name": "SU Test",
        "start": "2026-11-27",
        "end": "2026-11-27",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-m7-w7-mr9-11",
    "category": "Sound Suite",
    "model": "M7/W7 MR9(11월)",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "MT8532",
    "hwPm": "",
    "swPo": "",
    "swPm": "박윤규/이마을",
    "spec": "100W, \n2.1.1, \nDAFC",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "PreQP1",
        "start": "2026-11-04",
        "end": "2026-11-09",
        "kind": "sw"
      },
      {
        "name": "PreQP2",
        "start": "2026-11-11",
        "end": "2026-11-13",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-11-17",
        "end": "2026-11-20",
        "kind": "sw"
      },
      {
        "name": "QP 2",
        "start": "2026-11-24",
        "end": "2026-11-26",
        "kind": "sw"
      },
      {
        "name": "SU Test",
        "start": "2026-11-27",
        "end": "2026-11-27",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-s90c",
    "category": "사운드바(Wi-Fi)",
    "model": "S90C",
    "variant": "JDM B_HW",
    "manufacturer": "",
    "soc": "ax26sb",
    "hwPm": "",
    "swPo": "",
    "swPm": "이홍순",
    "spec": "710W 5.1.3\nAtmos, Wi-Fi\nDTS:X",
    "pv": "2027/1/13",
    "mp": "2027/1/25",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-30",
        "end": "2026-11-09",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-10-30",
        "end": "2026-11-09",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-11-18",
        "end": "2026-11-24",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-11-18",
        "end": "2026-11-24",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-12-01",
        "end": "2026-12-04",
        "kind": "hw"
      },
      {
        "name": "FC 3",
        "start": "2026-12-01",
        "end": "2026-12-04",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2027-01-25",
        "end": "2027-01-25",
        "kind": "hw"
      },
      {
        "name": "QP 1",
        "start": "2026-12-14",
        "end": "2026-12-24",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2027-01-05",
        "end": "2027-01-12",
        "kind": "hw"
      },
      {
        "name": "QP 2",
        "start": "2027-01-05",
        "end": "2027-01-12",
        "kind": "sw"
      },
      {
        "name": "SIT1",
        "start": "2026-10-06",
        "end": "2026-10-13",
        "kind": "sw"
      },
      {
        "name": "SIT2",
        "start": "2026-10-21",
        "end": "2026-10-23",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-s80c",
    "category": "사운드바(BT)",
    "model": "S80C",
    "variant": "JDM_B_HW",
    "manufacturer": "",
    "soc": "MLC3760",
    "hwPm": "",
    "swPo": "",
    "swPm": "고석민/윤필규",
    "spec": "590W, 3.1.3\nAtmos, BT, DTS:X",
    "pv": "2026/12/14",
    "mp": "2026/12/28",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-08-25",
        "end": "2026-09-02",
        "kind": "hw"
      },
      {
        "name": "Dev Test",
        "start": "2026-08-25",
        "end": "2026-09-02",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-09-21",
        "end": "2026-10-02",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-09-21",
        "end": "2026-10-02",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-10-08",
        "end": "2026-10-26",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-10-08",
        "end": "2026-10-26",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2026-12-28",
        "end": "2026-12-28",
        "kind": "hw"
      },
      {
        "name": "QP 1",
        "start": "2026-11-24",
        "end": "2026-12-01",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2026-12-07",
        "end": "2026-12-09",
        "kind": "hw"
      },
      {
        "name": "QP 2",
        "start": "2026-12-07",
        "end": "2026-12-09",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-cb-sh",
    "category": "Accessory",
    "model": "CB-SH",
    "variant": "JDM Cc_ACC",
    "manufacturer": "",
    "soc": "ESS",
    "hwPm": "",
    "swPo": "",
    "swPm": "고석민/윤필규",
    "spec": "HDMI In 2ea (4:4:4)\nHDMI out 1ea\nHDMI eARC out 1ea\nOptical In 1ea",
    "pv": "2026/11/17",
    "mp": "2026/11/27",
    "ats": "",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-08-25",
        "end": "2026-09-02",
        "kind": "hw"
      },
      {
        "name": "Dev Test",
        "start": "2026-08-25",
        "end": "2026-09-02",
        "kind": "sw"
      },
      {
        "name": "PV1",
        "start": "2026-09-21",
        "end": "2026-10-02",
        "kind": "hw"
      },
      {
        "name": "FC 1",
        "start": "2026-09-21",
        "end": "2026-10-02",
        "kind": "sw"
      },
      {
        "name": "PV2",
        "start": "2026-10-08",
        "end": "2026-10-26",
        "kind": "hw"
      },
      {
        "name": "FC 2",
        "start": "2026-10-08",
        "end": "2026-10-26",
        "kind": "sw"
      },
      {
        "name": "MP",
        "start": "2026-11-27",
        "end": "2026-11-27",
        "kind": "hw"
      },
      {
        "name": "QP 1",
        "start": "2026-11-24",
        "end": "2026-12-01",
        "kind": "sw"
      },
      {
        "name": "ATS",
        "start": "2026-12-07",
        "end": "2026-12-09",
        "kind": "hw"
      },
      {
        "name": "QP 2",
        "start": "2026-12-07",
        "end": "2026-12-09",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-power9000",
    "category": "파티스피커",
    "model": "Power9000",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "MLC3735",
    "hwPm": "",
    "swPo": "",
    "swPm": "오제준/박시형",
    "spec": "-",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "QP 1",
        "start": "2026-09-30",
        "end": "2026-10-05",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-blast",
    "category": "무선스피커",
    "model": "Blast",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "BES2710",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "-",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "Dev Test",
        "start": "2026-09-28",
        "end": "2026-09-29",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-09-29",
        "end": "2026-10-01",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-bounce",
    "category": "무선스피커",
    "model": "Bounce",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "BES2710",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "-",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "QP 1",
        "start": "2026-10-14",
        "end": "2026-10-20",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-rock",
    "category": "무선스피커",
    "model": "Rock",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "BES2710",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "-",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "Dev Test",
        "start": "2026-10-01",
        "end": "2026-10-02",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-10-06",
        "end": "2026-10-13",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-stage501",
    "category": "무선스피커",
    "model": "Stage501",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "MLC3735",
    "hwPm": "",
    "swPo": "",
    "swPm": "오제준/박시형",
    "spec": "-",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "QP 1",
        "start": "2026-09-30",
        "end": "2026-10-05",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-xt7s",
    "category": "무선스피커",
    "model": "XT7S",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "QCC5125",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "-",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "Dev Test",
        "start": "2026-09-01",
        "end": "2026-09-04",
        "kind": "sw"
      },
      {
        "name": "QP 1",
        "start": "2026-09-16",
        "end": "2026-09-28",
        "kind": "sw"
      }
    ]
  },
  {
    "id": "ov-pc",
    "category": "이어버드",
    "model": "윈도우PC 앱",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "App",
    "hwPm": "",
    "swPo": "",
    "swPm": "조용승",
    "spec": "-",
    "pv": "-",
    "mp": "-",
    "ats": "",
    "events": [
      {
        "name": "QP 1",
        "start": "2026-10-20",
        "end": "2026-10-22",
        "kind": "sw"
      },
      {
        "name": "SU Test",
        "start": "2026-10-23",
        "end": "2026-10-23",
        "kind": "sw"
      }
    ]
  }
]
