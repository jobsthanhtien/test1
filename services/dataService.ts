import { User, Machine, ProductionReport, DowntimeReport, Role } from '../types';
import { DEFAULT_USERS, DEFAULT_MACHINES, GOOGLE_SHEET_APP_SCRIPT_URL } from '../constants';

// --- Local Storage Initialization ---
const initializeLocalStorage = () => {
  if (!localStorage.getItem('cnc_users')) {
    localStorage.setItem('cnc_users', JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem('cnc_machines')) {
    localStorage.setItem('cnc_machines', JSON.stringify(DEFAULT_MACHINES));
  }
};

initializeLocalStorage();

// --- User Management ---
export const getUsers = (): User[] => {
  const users = localStorage.getItem('cnc_users');
  return users ? JSON.parse(users) : [];
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem('cnc_users', JSON.stringify(users));
};

// --- Machine Management ---
export const getMachines = (): Machine[] => {
  const machines = localStorage.getItem('cnc_machines');
  return machines ? JSON.parse(machines) : [];
};

export const saveMachines = (machines: Machine[]) => {
  localStorage.setItem('cnc_machines', JSON.stringify(machines));
};

// --- Report History Management ---
const getLocalStorageItem = <T>(key: string, defaultValue: T[] = []): T[] => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
}

const setLocalStorageItem = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
}

export const getProductionReports = (): ProductionReport[] => getLocalStorageItem<ProductionReport>('cnc_production_reports');
export const saveProductionReports = (reports: ProductionReport[]) => setLocalStorageItem('cnc_production_reports', reports);
export const getDowntimeReports = (): DowntimeReport[] => getLocalStorageItem<DowntimeReport>('cnc_downtime_reports');
export const saveDowntimeReports = (reports: DowntimeReport[]) => setLocalStorageItem('cnc_downtime_reports', reports);


// --- Google Sheets API Service ---
const postToGoogleSheet = async (data: object): Promise<{success: boolean, message: string}> => {
  if (GOOGLE_SHEET_APP_SCRIPT_URL.includes('YOUR_DEPLOYMENT_ID')) {
    console.warn("Google Apps Script URL is not configured. Data will not be sent.");
    return { success: false, message: "Endpoint không được cấu hình. Vui lòng liên hệ quản trị viên." };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const response = await fetch(GOOGLE_SHEET_APP_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
            return { success: true, message: 'Dữ liệu đã được gửi thành công!' };
        } else {
            return { success: false, message: `Lỗi từ server: ${result.message}` };
        }
    } else {
        return { success: false, message: `Lỗi mạng: ${response.status} ${response.statusText}` };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
        return { success: false, message: 'Yêu cầu hết thời gian. Vui lòng thử lại.' };
    }
    return { success: false, message: `Gửi dữ liệu thất bại: ${error.message}` };
  }
};

const mapProductionReportForSheet = (report: ProductionReport) => ({
    "Ngày triển khai": new Date(report.deploymentDate).getDate(),
    "Tháng Triển Khai": new Date(report.deploymentDate).getMonth() + 1,
    "Năm Triển Khai": new Date(report.deploymentDate).getFullYear(),
    "Mã Dự Án": report.projectCode,
    "Mã KH": report.customerCode,
    "Mục Số - Tên hạng mục": report.itemName,
    "Tên chi tiết gia công": report.partName,
    "Tên Máy Thực Hiện": report.machineName,
    "Số lượng kế hoạch (PCS)": report.plannedQty,
    "Số lượng thực tế (PCS)": report.actualQty,
    "Số lượng chưa hoàn thành (PCS)": report.plannedQty - report.actualQty,
    "Số lượng hàng NG": report.ngQty,
    "Thời gian bắt đầu (giờ/phút)": report.startTime,
    "Thời gian kết thúc (giờ/phút)": report.endTime,
    "Công đoạn Gia Công Bề Mặt": report.surfaceProcess,
    "Công đoạn khác": report.otherProcess,
    "Người thực hiện": report.operator,
    "Người Giám Sát": report.supervisor,
    "Thời gian dự kiến theo lập trình (phút/Sp)": report.estimatedTimePerPiece,
});

export const submitProductionReport = async (report: ProductionReport) => {
    const submissionData = {
        sheetName: 'Production',
        data: mapProductionReportForSheet(report)
    };
    const result = await postToGoogleSheet(submissionData);
    if (result.success) {
        const allReports = getProductionReports();
        const newReportWithId = { ...report, id: `prod-${Date.now()}` };
        saveProductionReports([...allReports, newReportWithId]);
    }
    return result;
};

export const updateProductionReport = async (report: ProductionReport) => {
    const submissionData = {
        sheetName: 'Production',
        data: mapProductionReportForSheet(report)
    };
    const result = await postToGoogleSheet(submissionData);
    if (result.success) {
        const allReports = getProductionReports();
        const updatedReports = allReports.map(r => r.id === report.id ? report : r);
        saveProductionReports(updatedReports);
    }
    return result;
};

export const submitDowntimeReport = async (report: DowntimeReport) => {
    const submissionData = {
        sheetName: 'Downtime',
        data: {
            "Ngày máy dừng hoạt động": new Date(report.downtimeDate).getDate(),
            "Tháng Máy Dừng": new Date(report.downtimeDate).getMonth() + 1,
            "Tên Máy": report.machineName,
            "Thời gian máy bắt đầu dừng": report.startTime,
            "Thời gian máy hoạt động trở lại": report.endTime,
            "Nguyên Nhân Máy Dừng": report.reason,
        }
    };
    const result = await postToGoogleSheet(submissionData);
    if (result.success) {
        const allReports = getDowntimeReports();
        const newReportWithId = { ...report, id: `down-${Date.now()}` };
        saveDowntimeReports([...allReports, newReportWithId]);
    }
    return result;
};
/*
    --- Google Apps Script Setup Guide ---

    To make this work, you need to create a Google Apps Script connected to your Google Sheet.

    1. Open your Google Sheet.
    2. Go to Extensions > Apps Script.
    3. Paste the code below into the `Code.gs` file.
    4. Click "Deploy" > "New deployment".
    5. Select "Web app" as the type.
    6. In "Who has access", select "Anyone". **This makes your sheet publicly writable through the script.**
    7. Click "Deploy".
    8. Copy the "Web app URL".
    9. Paste this URL into the `GOOGLE_SHEET_APP_SCRIPT_URL` constant in `constants.tsx`.

    --- Apps Script Code (Code.gs) ---

    function doPost(e) {
      try {
        var requestData = JSON.parse(e.postData.contents);
        var sheetName = requestData.sheetName;
        var data = requestData.data;
        
        if (!sheetName || !data) {
          throw new Error("Invalid request format. 'sheetName' and 'data' are required.");
        }
        
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
          // If sheet doesn't exist, create it with headers
          sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
          sheet.appendRow(Object.keys(data));
        }
        
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var rowData = headers.map(function(header) {
          return data[header] !== undefined ? data[header] : "";
        });
        
        sheet.appendRow(rowData);
        
        return ContentService
          .createTextOutput(JSON.stringify({ "status": "success", "message": "Row added to " + sheetName }))
          .setMimeType(ContentService.MimeType.JSON);
          
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({ "status": "error", "message": error.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
*/