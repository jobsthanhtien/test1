
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
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return { success: false, message: 'Lỗi kết nối: Không thể gửi đến Google Sheet. Vui lòng kiểm tra lại cấu hình CORS trong Apps Script.' };
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
    ================================================================================
    === HƯỚNG DẪN CÀI ĐẶT GOOGLE APPS SCRIPT ===
    ================================================================================

    Lỗi bạn gặp phải là do sao chép nhầm mã. Để khắc phục, hãy làm theo các bước sau:

    1. Mở file có tên là `google-apps-script.gs.txt` trong cây thư mục của ứng dụng.
    2. Sao chép TOÀN BỘ nội dung của file đó.
    3. Dán vào file `Code.gs` trong trình soạn thảo Google Apps Script của bạn
       (nhớ xóa hết mã cũ đi trước).
    4. Triển khai lại phiên bản mới.
*/
