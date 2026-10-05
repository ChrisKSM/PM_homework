import type { OverviewModel } from '../types/modelScheduleOverview'

/** 검증일정.csv + 검증일정2.csv import */
export const OVERVIEW_MOCK_MODELS: OverviewModel[] = [
  {
    "id": "ov-cb-sh",
    "category": "사운드바",
    "model": "CB-SH",
    "variant": "JDM Cc_ACC",
    "manufacturer": "Tonly",
    "soc": "ES8680",
    "hwPm": "편인태",
    "swPo": "",
    "swPm": "고석민/윤필규",
    "spec": "HDMI In 2ea (4:4:4)HDMI out 1eaHDMI eARC out 1eaOptical In 1ea",
    "pv": "26/11/17",
    "mp": "26/11/27",
    "ats": "27/1/22",
    "events": [
      {
        "name": "PV2",
        "start": "2026-10-01",
        "end": "2026-11-26"
      },
      {
        "name": "MP",
        "start": "2026-11-27",
        "end": "2027-01-31"
      }
    ]
  },
  {
    "id": "ov-s80c",
    "category": "사운드바",
    "model": "S80C",
    "variant": "JDM_B_HW",
    "manufacturer": "Tonly",
    "soc": "MLC3760",
    "hwPm": "이규봉",
    "swPo": "고석민",
    "swPm": "고석민/윤필규",
    "spec": "590W, 3.1.3Atmos, BT, DTS:X",
    "pv": "27/12/14",
    "mp": "27/12/28",
    "ats": "27/2/22",
    "events": [
      {
        "name": "PV1",
        "start": "2026-10-01",
        "end": "2026-11-09"
      },
      {
        "name": "PV2",
        "start": "2026-11-10",
        "end": "2026-12-27"
      },
      {
        "name": "MP",
        "start": "2026-12-28",
        "end": "2027-01-31"
      }
    ]
  },
  {
    "id": "ov-s90c",
    "category": "사운드바",
    "model": "S90C",
    "variant": "JDM B_HW",
    "manufacturer": "Tonly",
    "soc": "Amlogic",
    "hwPm": "이현인",
    "swPo": "김현자",
    "swPm": "이홍순",
    "spec": "710W 5.1.3Atmos, Wi-FiDTS:X",
    "pv": "27/1/13",
    "mp": "27/1/25",
    "ats": "27/3/22",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-01",
        "end": "2026-11-06"
      },
      {
        "name": "PV1",
        "start": "2026-11-07",
        "end": "2026-12-19"
      },
      {
        "name": "PV2",
        "start": "2026-12-20",
        "end": "2027-01-24"
      },
      {
        "name": "MP",
        "start": "2027-01-25",
        "end": "2027-01-31"
      },
      {
        "name": "FC 1",
        "start": "2026-10-30",
        "end": "2026-11-09"
      },
      {
        "name": "FC 2",
        "start": "2026-11-18",
        "end": "2026-11-24"
      },
      {
        "name": "FC 3",
        "start": "2026-12-01",
        "end": "2026-12-04"
      },
      {
        "name": "QP 1",
        "start": "2026-12-14",
        "end": "2026-12-24"
      },
      {
        "name": "QP 2",
        "start": "2027-01-05",
        "end": "2027-01-12"
      },
      {
        "name": "SIT1",
        "start": "2026-10-06",
        "end": "2026-10-13"
      },
      {
        "name": "SIT2",
        "start": "2026-10-21",
        "end": "2026-10-23"
      }
    ]
  },
  {
    "id": "ov-power9000",
    "category": "파티스피커",
    "model": "Power9000",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "",
    "hwPm": "",
    "swPo": "",
    "swPm": "오제준/박시형",
    "spec": "",
    "pv": "NA",
    "mp": "NA",
    "ats": "NA",
    "events": [
      {
        "name": "QP 1",
        "start": "2026-09-30",
        "end": "2026-10-05"
      }
    ]
  },
  {
    "id": "ov-stage501",
    "category": "파티스피커",
    "model": "Stage501",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "",
    "hwPm": "",
    "swPo": "",
    "swPm": "오제준/박시형",
    "spec": "",
    "pv": "NA",
    "mp": "NA",
    "ats": "NA",
    "events": [
      {
        "name": "QP 1",
        "start": "2026-09-30",
        "end": "2026-10-05"
      }
    ]
  },
  {
    "id": "ov-blast",
    "category": "무선스피커",
    "model": "Blast",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "",
    "pv": "NA",
    "mp": "NA",
    "ats": "NA",
    "events": [
      {
        "name": "Dev Test",
        "start": "2026-09-28",
        "end": "2026-09-29"
      },
      {
        "name": "QP 1",
        "start": "2026-09-29",
        "end": "2026-10-01"
      }
    ]
  },
  {
    "id": "ov-bounce",
    "category": "무선스피커",
    "model": "Bounce",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "",
    "pv": "NA",
    "mp": "NA",
    "ats": "NA",
    "events": [
      {
        "name": "QP 1",
        "start": "2026-10-14",
        "end": "2026-10-20"
      }
    ]
  },
  {
    "id": "ov-rock",
    "category": "무선스피커",
    "model": "Rock",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "",
    "pv": "NA",
    "mp": "NA",
    "ats": "NA",
    "events": [
      {
        "name": "Dev Test",
        "start": "2026-10-01",
        "end": "2026-10-02"
      },
      {
        "name": "QP 1",
        "start": "2026-10-06",
        "end": "2026-10-13"
      }
    ]
  },
  {
    "id": "ov-xt7s",
    "category": "무선스피커",
    "model": "XT7S",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "",
    "hwPm": "",
    "swPo": "",
    "swPm": "이재철/나택수",
    "spec": "",
    "pv": "NA",
    "mp": "NA",
    "ats": "NA",
    "events": [
      {
        "name": "Dev Test",
        "start": "2026-09-01",
        "end": "2026-09-04"
      },
      {
        "name": "QP 1",
        "start": "2026-09-16",
        "end": "2026-09-28"
      }
    ]
  },
  {
    "id": "ov-h5",
    "category": "Sound Suite",
    "model": "H5",
    "variant": "JDM Ca_HW",
    "manufacturer": "",
    "soc": "",
    "hwPm": "한규민",
    "swPo": "",
    "swPm": "조성연",
    "spec": "300W, 3.1.3(7.1.5 Spatial Audio)Dolby Atmos, DAFC",
    "pv": "27/12/30",
    "mp": "27/1/11",
    "ats": "27/3/8",
    "events": [
      {
        "name": "PV1",
        "start": "2026-10-01",
        "end": "2026-11-25"
      },
      {
        "name": "PV2",
        "start": "2026-11-26",
        "end": "2027-01-10"
      },
      {
        "name": "MP",
        "start": "2027-01-11",
        "end": "2027-01-31"
      },
      {
        "name": "FC 1",
        "start": "2026-10-21",
        "end": "2026-10-28"
      },
      {
        "name": "FC 2",
        "start": "2026-11-06",
        "end": "2026-11-12"
      },
      {
        "name": "FC 3",
        "start": "2026-11-20",
        "end": "2026-11-24"
      },
      {
        "name": "QP 1",
        "start": "2026-12-03",
        "end": "2026-12-11"
      },
      {
        "name": "QP 2",
        "start": "2026-12-21",
        "end": "2026-12-23"
      }
    ]
  },
  {
    "id": "ov-h7-vi",
    "category": "Sound Suite",
    "model": "H7_VI",
    "variant": "JDM B_HW",
    "manufacturer": "Tymphany",
    "soc": "Amlogic",
    "hwPm": "편인태",
    "swPo": "김현자",
    "swPm": "조성연",
    "spec": "500W, 5.1.3 (9.1.6 Spatial)Dolby Atmos, DAFC",
    "pv": "26/11/30",
    "mp": "26/12/14",
    "ats": "27/2/8",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-01",
        "end": "2026-10-20"
      },
      {
        "name": "PV1",
        "start": "2026-10-21",
        "end": "2026-11-04"
      },
      {
        "name": "PV2",
        "start": "2026-11-05",
        "end": "2026-12-13"
      },
      {
        "name": "MP",
        "start": "2026-12-14",
        "end": "2027-01-31"
      },
      {
        "name": "FC 1",
        "start": "2026-10-15",
        "end": "2026-10-23"
      },
      {
        "name": "FC 2",
        "start": "2026-10-30",
        "end": "2026-11-06"
      },
      {
        "name": "FC 3",
        "start": "2026-11-12",
        "end": "2026-11-16"
      },
      {
        "name": "QP 1",
        "start": "2026-11-19",
        "end": "2026-11-27"
      },
      {
        "name": "QP 2",
        "start": "2026-12-07",
        "end": "2026-12-11"
      },
      {
        "name": "S I T1",
        "start": "2026-08-13",
        "end": "2026-08-21"
      },
      {
        "name": "S I T2",
        "start": "2026-09-11",
        "end": "2026-09-18"
      },
      {
        "name": "S I T3",
        "start": "2026-09-29",
        "end": "2026-10-08"
      }
    ]
  },
  {
    "id": "ov-m5-vi",
    "category": "Sound Suite",
    "model": "M5_VI",
    "variant": "JDM Ca_HW",
    "manufacturer": "",
    "soc": "",
    "hwPm": "박현구",
    "swPo": "",
    "swPm": "박윤규/ 이마을",
    "spec": "60W, 1.1.1, DAFC",
    "pv": "27/2/28",
    "mp": "27/2/28",
    "ats": "27/4/25",
    "events": [
      {
        "name": "PV1",
        "start": "2026-10-01",
        "end": "2026-11-09"
      },
      {
        "name": "PV2",
        "start": "2026-11-10",
        "end": "2026-12-27"
      },
      {
        "name": "MP",
        "start": "2026-12-28",
        "end": "2027-01-31"
      }
    ]
  },
  {
    "id": "ov-m7",
    "category": "Sound Suite",
    "model": "M7",
    "variant": "MR_Minor",
    "manufacturer": "",
    "soc": "MT8532",
    "hwPm": "",
    "swPo": "박윤규/ 이마을",
    "swPm": "박윤규/ 이마을",
    "spec": "100W, 2.1.1, DAFC",
    "pv": "NA",
    "mp": "NA",
    "ats": "NA",
    "events": [
      {
        "name": "Dev Test",
        "start": "2026-09-04",
        "end": "2026-09-08"
      },
      {
        "name": "QP 1",
        "start": "2026-09-09",
        "end": "2026-09-17"
      },
      {
        "name": "QP 2",
        "start": "2026-09-18",
        "end": "2026-09-23"
      }
    ]
  },
  {
    "id": "ov-m7-vi",
    "category": "Sound Suite",
    "model": "M7_VI",
    "variant": "JDM B_HW",
    "manufacturer": "",
    "soc": "",
    "hwPm": "박현구",
    "swPo": "",
    "swPm": "박윤규/ 이마을",
    "spec": "100W, 2.1.1, DAFC",
    "pv": "27/2/16",
    "mp": "27/2/28",
    "ats": "27/4/25",
    "events": [
      {
        "name": "PV1",
        "start": "2026-10-01",
        "end": "2026-11-09"
      },
      {
        "name": "PV2",
        "start": "2026-11-10",
        "end": "2026-12-27"
      },
      {
        "name": "MP",
        "start": "2026-12-28",
        "end": "2027-01-31"
      },
      {
        "name": "FC 1",
        "start": "2026-11-02",
        "end": "2026-11-10"
      },
      {
        "name": "FC 2",
        "start": "2026-11-18",
        "end": "2026-11-24"
      },
      {
        "name": "FC 3",
        "start": "2026-12-02",
        "end": "2026-12-04"
      },
      {
        "name": "QP 1",
        "start": "2026-12-14",
        "end": "2026-12-28"
      },
      {
        "name": "QP 2",
        "start": "2027-01-06",
        "end": "2027-01-13"
      },
      {
        "name": "QP 3",
        "start": "2027-01-21",
        "end": "2027-01-27"
      },
      {
        "name": "SIT 1",
        "start": "2026-10-12",
        "end": "2026-10-16"
      },
      {
        "name": "SIT 2",
        "start": "2026-10-21",
        "end": "2026-10-23"
      }
    ]
  },
  {
    "id": "ov-w5",
    "category": "Sound Suite",
    "model": "W5",
    "variant": "JDM B_HW",
    "manufacturer": "",
    "soc": "",
    "hwPm": "한규민",
    "swPo": "조용승",
    "swPm": "조용승",
    "spec": "120W+120W서브우퍼",
    "pv": "27/1/10",
    "mp": "27/1/22",
    "ats": "27/3/19",
    "events": [
      {
        "name": "PrePV",
        "start": "2026-10-01",
        "end": "2026-10-15"
      },
      {
        "name": "PV1",
        "start": "2026-10-16",
        "end": "2026-12-04"
      },
      {
        "name": "PV2",
        "start": "2026-12-05",
        "end": "2027-01-21"
      },
      {
        "name": "MP",
        "start": "2027-01-22",
        "end": "2027-01-31"
      },
      {
        "name": "Dev Test",
        "start": "2026-09-07",
        "end": "2026-10-16"
      },
      {
        "name": "FC 1",
        "start": "2026-10-19",
        "end": "2026-10-30"
      },
      {
        "name": "FC 2",
        "start": "2026-11-23",
        "end": "2026-12-03"
      },
      {
        "name": "QP 1",
        "start": "2026-12-04",
        "end": "2026-12-18"
      },
      {
        "name": "QP 2",
        "start": "2027-01-04",
        "end": "2027-01-08"
      },
      {
        "name": "MP approval",
        "start": "2027-01-11",
        "end": "2027-01-22"
      }
    ]
  }
]
