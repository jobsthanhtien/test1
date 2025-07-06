import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Role, ProductionReport, DowntimeReport, Machine } from '../types';
import { ICONS, surfaceProcessOptions } from '../constants';
import * as dataService from '../services/dataService';
import { Card, Button, Input, Select, Modal } from '../components/ui';

// --- Helper Components ---

const today = new Date().toISOString().split('T')[0];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-4">
        <div className="p-3 mr-4 text-accent bg-accent bg-opacity-20 rounded-full">{icon}</div>
        <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </Card>
);

// --- View Components ---

const DashboardView: React.FC<{ user: User }> = ({ user }) => {
    const machines = dataService.getMachines();
    const users = dataService.getUsers();

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Chào mừng trở lại, {user.fullName}!</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Tổng số máy" value={machines.length.toString()} icon={ICONS.machines} />
                <StatCard title="Tổng số người dùng" value={users.length.toString()} icon={ICONS.users} />
                <StatCard title="Vai trò của bạn" value={user.role} icon={ICONS.dashboard} />
            </div>
             <Card title="Hướng dẫn nhanh" className="mt-6">
                <p className="text-text-secondary">
                    Sử dụng thanh điều hướng bên trái để truy cập các chức năng:
                </p>
                <ul className="list-disc list-inside mt-4 space-y-2 text-text-secondary">
                    <li><b>Bảng điều khiển:</b> Xem thông tin tổng quan.</li>
                    <li><b>Báo cáo sản xuất:</b> Ghi lại nhật ký vận hành hàng ngày cho các máy CNC.</li>
                    <li><b>Báo cáo dừng máy:</b> Ghi lại thông tin khi máy dừng hoạt động.</li>
                    <li><b>Lịch sử Báo cáo:</b> Xem lại và chỉnh sửa các báo cáo đã gửi.</li>
                    {user.role === Role.Admin && (
                        <>
                            <li><b>Quản lý người dùng:</b> (Admin) Thêm, sửa, xóa người dùng và gán máy mặc định.</li>
                            <li><b>Quản lý máy:</b> (Admin) Thêm, sửa, xóa máy.</li>
                        </>
                    )}
                </ul>
            </Card>
        </div>
    );
};

const ProductionReportView: React.FC<{user: User}> = ({ user }) => {
    const getInitialReportState = useCallback((): Omit<ProductionReport, 'id'> => {
        const allMachines = dataService.getMachines();
        const defaultMachine = user.defaultMachineId
            ? allMachines.find(m => m.id === user.defaultMachineId)
            : undefined;
        
        return {
            deploymentDate: today,
            projectCode: '',
            customerCode: '',
            itemName: '',
            partName: '',
            machineName: defaultMachine?.name || '',
            plannedQty: 0,
            actualQty: 0,
            ngQty: 0,
            startTime: '',
            endTime: '',
            surfaceProcess: 'N/A',
            otherProcess: '',
            operator: user.fullName,
            supervisor: '',
            programmer: '',
            setter: '',
            estimatedTimePerPiece: 0
        };
    }, [user]);

    const [report, setReport] = useState<Omit<ProductionReport, 'id'>>(getInitialReportState());
    const [machines, setMachines] = useState<Machine[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        setMachines(dataService.getMachines());
        setUsers(dataService.getUsers());
    }, []);
    
    // Auto-calculate actual time per piece
    useEffect(() => {
        const { startTime, endTime, actualQty } = report;

        if (startTime && endTime && actualQty > 0) {
            const start = new Date(`1970-01-01T${startTime}:00`);
            const end = new Date(`1970-01-01T${endTime}:00`);

            if (end > start) {
                const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                const calculatedTime = durationMinutes / actualQty;
                const roundedTime = Math.round(calculatedTime * 100) / 100;
                
                if (roundedTime !== report.estimatedTimePerPiece) {
                    setReport(prev => ({ ...prev, estimatedTimePerPiece: roundedTime }));
                }
            } else {
                 if (report.estimatedTimePerPiece !== 0) {
                    setReport(prev => ({ ...prev, estimatedTimePerPiece: 0 }));
                 }
            }
        } else {
            if (report.estimatedTimePerPiece !== 0) {
                setReport(prev => ({ ...prev, estimatedTimePerPiece: 0 }));
            }
        }
    }, [report.startTime, report.endTime, report.actualQty, report.estimatedTimePerPiece]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'number';

        setReport(prev => {
            const newReport = {
                ...prev,
                [name]: isNumber ? Number(value) : value
            };

            if (name === 'projectCode') {
                newReport.customerCode = value.substring(0, 2).toUpperCase();
            }

            return newReport;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        const result = await dataService.submitProductionReport(report as ProductionReport);
        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            setReport(getInitialReportState());
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        setIsLoading(false);
        setTimeout(() => setMessage(null), 5000);
    };

    return (
        <Card title="Báo cáo Sản xuất Hàng ngày">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Input label="Ngày triển khai" name="deploymentDate" type="date" value={report.deploymentDate} onChange={handleChange} required />
                    <Input label="Mã Dự Án" name="projectCode" value={report.projectCode} onChange={handleChange} required />
                    <Input label="Mã KH" name="customerCode" value={report.customerCode} onChange={handleChange} required readOnly className="bg-secondary cursor-not-allowed" />
                    <Input label="Mục Số - Tên hạng mục" name="itemName" value={report.itemName} onChange={handleChange} required />
                </div>
                <hr className="border-secondary"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Tên chi tiết gia công" name="partName" value={report.partName} onChange={handleChange} required />
                     <Select label="Tên Máy Thực Hiện" name="machineName" value={report.machineName} onChange={handleChange} required>
                        <option value="">Chọn máy</option>
                        {machines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </Select>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="Số lượng kế hoạch (PCS)" name="plannedQty" type="number" value={report.plannedQty || ''} onChange={handleChange} required />
                    <Input label="Số lượng thực tế (PCS)" name="actualQty" type="number" value={report.actualQty || ''} onChange={handleChange} required />
                    <Input label="Số lượng hàng NG" name="ngQty" type="number" value={report.ngQty || ''} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input label="Thời gian bắt đầu (24h)" name="startTime" type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" value={report.startTime} onChange={handleChange} required />
                    <Input label="Thời gian kết thúc (24h)" name="endTime" type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" value={report.endTime} onChange={handleChange} required />
                    <Input label="Thời gian gia công/SP (phút - tự tính)" name="estimatedTimePerPiece" type="number" value={report.estimatedTimePerPiece} readOnly className="bg-secondary cursor-not-allowed" />
                </div>
                <hr className="border-secondary"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select label="Công đoạn Gia Công Bề Mặt" name="surfaceProcess" value={report.surfaceProcess} onChange={handleChange}>
                       {surfaceProcessOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>
                    <Input label="Công đoạn khác" name="otherProcess" value={report.otherProcess} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     <Select label="Người thực hiện" name="operator" value={report.operator} onChange={handleChange} required>
                        <option value="">Chọn người thực hiện</option>
                        {users.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                     <Select label="Người Giám Sát" name="supervisor" value={report.supervisor} onChange={handleChange} required>
                        <option value="">Chọn người giám sát</option>
                        {users.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                     <Select label="Người Lập Trình" name="programmer" value={report.programmer || ''} onChange={handleChange}>
                        <option value="">Chọn người lập trình</option>
                        {users.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                     <Select label="Người Gá Đặt" name="setter" value={report.setter || ''} onChange={handleChange}>
                        <option value="">Chọn người gá đặt</option>
                        {users.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                </div>
                <div className="flex justify-end items-center space-x-4">
                    {message && <p className={`text-sm ${message.type === 'success' ? 'text-success' : 'text-error'}`}>{message.text}</p>}
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Đang gửi...' : 'Gửi Báo Cáo'}</Button>
                </div>
            </form>
        </Card>
    );
};

const DowntimeReportView: React.FC = () => {
    const initialReportState: DowntimeReport = {
        downtimeDate: today, machineName: '', startTime: '', endTime: '', reason: ''
    };
    const [report, setReport] = useState<DowntimeReport>(initialReportState);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        setMachines(dataService.getMachines());
    }, []);

     const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setReport(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);
        const result = await dataService.submitDowntimeReport(report);
        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            setReport(initialReportState);
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        setIsLoading(false);
        setTimeout(() => setMessage(null), 5000);
    };

    return (
        <Card title="Báo cáo Dừng Máy">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Ngày máy dừng" name="downtimeDate" type="date" value={report.downtimeDate} onChange={handleChange} required />
                     <Select label="Tên Máy" name="machineName" value={report.machineName} onChange={handleChange} required>
                        <option value="">Chọn máy</option>
                        {machines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </Select>
                    <Input label="Thời gian bắt đầu dừng (24h)" name="startTime" type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" value={report.startTime} onChange={handleChange} required />
                    <Input label="Thời gian hoạt động lại (24h)" name="endTime" type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" value={report.endTime} onChange={handleChange} required />
                </div>
                <Input label="Nguyên Nhân Máy Dừng" name="reason" value={report.reason} onChange={handleChange} required />
                <div className="flex justify-end items-center space-x-4">
                    {message && <p className={`text-sm ${message.type === 'success' ? 'text-success' : 'text-error'}`}>{message.text}</p>}
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Đang gửi...' : 'Gửi Báo Cáo'}</Button>
                </div>
            </form>
        </Card>
    );
};

const UserManagementView: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        setUsers(dataService.getUsers());
        setMachines(dataService.getMachines());
    }, []);
    
    const handleSaveUser = (user: User) => {
        let updatedUsers;
        const userToSave = { ...user };
        if (!userToSave.defaultMachineId) {
            delete userToSave.defaultMachineId;
        }

        if(userToSave.id) { // Editing existing
            updatedUsers = users.map(u => u.id === userToSave.id ? userToSave : u);
        } else { // Adding new
            const newUser = { ...userToSave, id: `user-${Date.now()}`};
            updatedUsers = [...users, newUser];
        }
        dataService.saveUsers(updatedUsers);
        setUsers(updatedUsers);
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
            const updatedUsers = users.filter(u => u.id !== userId);
            dataService.saveUsers(updatedUsers);
            setUsers(updatedUsers);
        }
    };

    const machineMap = useMemo(() => new Map(machines.map(m => [m.id, m.name])), [machines]);
    
    return (
        <Card title="Quản lý người dùng">
            <div className="flex justify-end mb-4">
                <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>
                    {ICONS.add} Thêm người dùng
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-secondary">
                        <tr>
                            <th className="p-3">Họ và Tên</th>
                            <th className="p-3">Tên đăng nhập</th>
                            <th className="p-3">Vai trò</th>
                            <th className="p-3">Máy Mặc Định</th>
                            <th className="p-3">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-secondary">
                                <td className="p-3">{user.fullName}</td>
                                <td className="p-3">{user.username}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${user.role === Role.Admin ? 'bg-accent' : 'bg-gray-500'}`}>{user.role}</span></td>
                                <td className="p-3">{user.defaultMachineId ? machineMap.get(user.defaultMachineId) : 'Chưa gán'}</td>
                                <td className="p-3 flex space-x-2">
                                    <Button variant="secondary" size="sm" onClick={() => { setEditingUser(user); setIsModalOpen(true); }}>{ICONS.edit}</Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDeleteUser(user.id)}>{ICONS.trash}</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {isModalOpen && <UserModal user={editingUser} allMachines={machines} onSave={handleSaveUser} onClose={() => setIsModalOpen(false)} />}
        </Card>
    );
};

const UserModal: React.FC<{user: User | null, allMachines: Machine[], onSave: (user: User) => void, onClose: () => void}> = ({ user, allMachines, onSave, onClose }) => {
    const [formData, setFormData] = useState<User>(user || { id: '', username: '', fullName: '', role: Role.Operator, password: '', defaultMachineId: '' });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={user ? 'Sửa người dùng' : 'Thêm người dùng'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Họ và Tên" name="fullName" value={formData.fullName} onChange={handleChange} required />
                <Input label="Tên đăng nhập" name="username" value={formData.username} onChange={handleChange} required />
                <Input label="Mật khẩu" name="password" type="password" placeholder={user ? "Để trống nếu không muốn thay đổi" : ""} required={!user} />
                <Select label="Vai trò" name="role" value={formData.role} onChange={handleChange} >
                    <option value={Role.Operator}>Operator</option>
                    <option value={Role.Admin}>Admin</option>
                </Select>
                <Select label="Máy Mặc Định" name="defaultMachineId" value={formData.defaultMachineId || ''} onChange={handleChange}>
                    <option value="">Không gán</option>
                    {allMachines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
            </form>
        </Modal>
    );
};


const MachineManagementView: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

    useEffect(() => {
        setMachines(dataService.getMachines());
    }, []);

    const handleSaveMachine = (machine: Machine) => {
        let updatedMachines;
        if (machine.id) {
            updatedMachines = machines.map(m => m.id === machine.id ? machine : m);
        } else {
            updatedMachines = [...machines, { ...machine, id: `machine-${Date.now()}` }];
        }
        dataService.saveMachines(updatedMachines);
        setMachines(updatedMachines);
        setIsModalOpen(false);
        setEditingMachine(null);
    };

    const handleDeleteMachine = (machineId: string) => {
        if (window.confirm('Bạn có chắc muốn xóa máy này?')) {
            const updatedMachines = machines.filter(m => m.id !== machineId);
            dataService.saveMachines(updatedMachines);
            setMachines(updatedMachines);
        }
    };
    
    return (
        <Card title="Quản lý máy">
            <div className="flex justify-end mb-4">
                <Button onClick={() => { setEditingMachine(null); setIsModalOpen(true); }}>{ICONS.add} Thêm máy</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-secondary">
                        <tr>
                            <th className="p-3">Tên Máy</th>
                            <th className="p-3">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machines.map(machine => (
                            <tr key={machine.id} className="border-b border-secondary">
                                <td className="p-3 font-semibold">{machine.name}</td>
                                <td className="p-3 flex space-x-2">
                                    <Button variant="secondary" size="sm" onClick={() => { setEditingMachine(machine); setIsModalOpen(true); }}>{ICONS.edit}</Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDeleteMachine(machine.id)}>{ICONS.trash}</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <MachineModal machine={editingMachine} onSave={handleSaveMachine} onClose={() => setIsModalOpen(false)} />}
        </Card>
    );
};

const MachineModal: React.FC<{ machine: Machine | null, onSave: (machine: Machine) => void, onClose: () => void }> = ({ machine, onSave, onClose }) => {
    const [formData, setFormData] = useState<Omit<Machine, 'id'>>(machine || { name: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: machine?.id || '' });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={machine ? 'Sửa thông tin máy' : 'Thêm máy mới'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Tên Máy" name="name" value={formData.name} onChange={handleChange} required />
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
            </form>
        </Modal>
    );
};

// --- History View ---

const ProductionReportEditModal: React.FC<{
    report: ProductionReport | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (report: ProductionReport) => Promise<void>;
    allMachines: Machine[];
    allUsers: User[];
}> = ({ report, isOpen, onClose, onSave, allMachines, allUsers }) => {
    const [formData, setFormData] = useState<ProductionReport | null>(null);

    useEffect(() => {
        setFormData(report);
    }, [report]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!formData) return;
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev!, [name]: (type === 'number' ? Number(value) : value) }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
        }
    };

    if (!isOpen || !formData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Chỉnh sửa Báo cáo Sản xuất">
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Ngày triển khai" name="deploymentDate" type="date" value={formData.deploymentDate} onChange={handleChange} required />
                    <Input label="Mã Dự Án" name="projectCode" value={formData.projectCode} onChange={handleChange} required />
                    <Input label="Mã KH" name="customerCode" value={formData.customerCode} onChange={handleChange} required />
                    <Input label="Mục Số - Tên hạng mục" name="itemName" value={formData.itemName} onChange={handleChange} required />
                    <Input label="Tên chi tiết gia công" name="partName" value={formData.partName} onChange={handleChange} required />
                    <Select label="Tên Máy Thực Hiện" name="machineName" value={formData.machineName} onChange={handleChange} required>
                        {allMachines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </Select>
                    <Input label="Thời gian dự kiến (phút/SP)" name="estimatedTimePerPiece" type="number" value={formData.estimatedTimePerPiece || ''} onChange={handleChange} required />
                    <Input label="Số lượng kế hoạch (PCS)" name="plannedQty" type="number" value={formData.plannedQty || ''} onChange={handleChange} required />
                    <Input label="Số lượng thực tế (PCS)" name="actualQty" type="number" value={formData.actualQty || ''} onChange={handleChange} required />
                    <Input label="Số lượng hàng NG" name="ngQty" type="number" value={formData.ngQty || ''} onChange={handleChange} required />
                    <Input label="Thời gian bắt đầu (24h)" name="startTime" type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" value={formData.startTime} onChange={handleChange} required />
                    <Input label="Thời gian kết thúc (24h)" name="endTime" type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" value={formData.endTime} onChange={handleChange} required />
                    <Select label="Công đoạn Gia Công Bề Mặt" name="surfaceProcess" value={formData.surfaceProcess} onChange={handleChange}>
                       {surfaceProcessOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>
                    <Input label="Công đoạn khác" name="otherProcess" value={formData.otherProcess} onChange={handleChange} />
                     <Select label="Người thực hiện" name="operator" value={formData.operator} onChange={handleChange} required>
                        {allUsers.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                     <Select label="Người Giám Sát" name="supervisor" value={formData.supervisor} onChange={handleChange} required>
                        {allUsers.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                     <Select label="Người Lập Trình" name="programmer" value={formData.programmer || ''} onChange={handleChange}>
                       <option value="">Không có</option>
                       {allUsers.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                     <Select label="Người Gá Đặt" name="setter" value={formData.setter || ''} onChange={handleChange}>
                        <option value="">Không có</option>
                        {allUsers.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                    </Select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Lưu thay đổi</Button>
                </div>
            </form>
        </Modal>
    );
};

const HistoryView: React.FC<{ user: User }> = ({ user }) => {
    // Raw data state
    const [productionReports, setProductionReports] = useState<ProductionReport[]>([]);
    const [downtimeReports, setDowntimeReports] = useState<DowntimeReport[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    
    // UI state
    const [editingReport, setEditingReport] = useState<ProductionReport | null>(null);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    
    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(''); // Stores user's full name

    const loadData = useCallback(() => {
        setProductionReports(dataService.getProductionReports());
        setDowntimeReports(dataService.getDowntimeReports());
        setAllUsers(dataService.getUsers());
        setAllMachines(dataService.getMachines());
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateReport = async (report: ProductionReport) => {
        setMessage(null);
        const result = await dataService.updateProductionReport(report);
        if (result.success) {
            setMessage({ type: 'success', text: "Báo cáo đã được cập nhật thành công!" });
            setEditingReport(null); // Close modal
            loadData(); // Refresh list
        } else {
            setMessage({ type: 'error', text: result.message });
        }
        setTimeout(() => setMessage(null), 5000);
    };

    const filteredProductionReports = useMemo(() => {
        let reports = productionReports;

        // Role-based filtering
        if (user.role !== Role.Admin) {
            reports = reports.filter(r => r.operator === user.fullName);
        } else if (selectedUser) { // Admin's filter by user
            reports = reports.filter(r => r.operator === selectedUser);
        }

        // Search filter
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            reports = reports.filter(r => {
                const searchString = [
                    r.projectCode,
                    r.customerCode,
                    r.itemName,
                    r.partName,
                    r.machineName,
                    r.operator,
                    r.supervisor,
                    r.programmer,
                    r.setter,
                ].join(' ').toLowerCase();
                return searchString.includes(lowercasedTerm);
            });
        }

        return reports.sort((a, b) => new Date(b.deploymentDate).getTime() - new Date(a.deploymentDate).getTime());
    }, [productionReports, user.role, user.fullName, selectedUser, searchTerm]);

    const filteredDowntimeReports = useMemo(() => {
        let reports = downtimeReports;
        
        // Search filter
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            reports = reports.filter(r =>
                r.machineName.toLowerCase().includes(lowercasedTerm) ||
                r.reason.toLowerCase().includes(lowercasedTerm)
            );
        }

        return reports.sort((a, b) => new Date(b.downtimeDate).getTime() - new Date(a.downtimeDate).getTime());
    }, [downtimeReports, searchTerm]);
    

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Lịch sử Báo cáo</h1>

            <Card>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-grow">
                        <Input
                            label="Tìm kiếm báo cáo"
                            id="history-search"
                            type="search"
                            placeholder="Nhập tên chi tiết, máy, người dùng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {user.role === Role.Admin && (
                        <div className="w-full md:w-1/3">
                            <Select
                                label="Lọc theo người dùng"
                                id="user-filter"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            >
                                <option value="">Tất cả người dùng</option>
                                {allUsers.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                            </Select>
                        </div>
                    )}
                </div>
            </Card>

            <Card title="Lịch sử Báo cáo Sản xuất">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="p-3">Ngày</th>
                                <th className="p-3">Tên Chi Tiết</th>
                                <th className="p-3">Máy</th>
                                <th className="p-3">SL Thực Tế</th>
                                {user.role === Role.Admin && <th className="p-3">Người Thực Hiện</th>}
                                <th className="p-3">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProductionReports.map(report => (
                                <tr key={report.id} className="border-b border-secondary">
                                    <td className="p-3">{report.deploymentDate}</td>
                                    <td className="p-3">{report.partName}</td>
                                    <td className="p-3">{report.machineName}</td>
                                    <td className="p-3">{report.actualQty}</td>
                                    {user.role === Role.Admin && <td className="p-3">{report.operator}</td>}
                                    <td className="p-3">
                                        <Button size="sm" variant="secondary" onClick={() => setEditingReport(report)}>{ICONS.edit}</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredProductionReports.length === 0 && <p className="text-center text-text-secondary p-4">Không có báo cáo sản xuất nào phù hợp.</p>}
                </div>
            </Card>

            <Card title="Lịch sử Báo cáo Dừng máy">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="p-3">Ngày Dừng</th>
                                <th className="p-3">Tên Máy</th>
                                <th className="p-3">Lý Do</th>
                                <th className="p-3">Thời Gian Dừng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDowntimeReports.map(report => (
                                <tr key={report.id} className="border-b border-secondary">
                                    <td className="p-3">{report.downtimeDate}</td>
                                    <td className="p-3">{report.machineName}</td>
                                    <td className="p-3">{report.reason}</td>
                                    <td className="p-3">{report.startTime} - {report.endTime}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredDowntimeReports.length === 0 && <p className="text-center text-text-secondary p-4">Không có báo cáo dừng máy nào phù hợp.</p>}
                </div>
            </Card>
            
            {message && <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white ${message.type === 'success' ? 'bg-success' : 'bg-error'}`}>{message.text}</div>}
            
            <ProductionReportEditModal 
                isOpen={!!editingReport}
                onClose={() => setEditingReport(null)}
                report={editingReport}
                onSave={handleUpdateReport}
                allMachines={allMachines}
                allUsers={allUsers}
            />
        </div>
    );
}


// --- Main App Component ---

interface MainAppProps {
  user: User;
  onLogout: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState('dashboard');
  
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveView(hash);
    }
  }, []);

  const handleNavClick = (view: string) => {
    setActiveView(view);
    window.location.hash = view;
  };
  
  const navItems = [
    { id: 'dashboard', label: 'Bảng điều khiển', icon: ICONS.dashboard, role: [Role.Admin, Role.Operator] },
    { id: 'production', label: 'Báo cáo Sản xuất', icon: ICONS.report, role: [Role.Admin, Role.Operator] },
    { id: 'downtime', label: 'Báo cáo Dừng máy', icon: ICONS.downtime, role: [Role.Admin, Role.Operator] },
    { id: 'history', label: 'Lịch sử Báo cáo', icon: ICONS.history, role: [Role.Admin, Role.Operator] },
    { id: 'users', label: 'Quản lý người dùng', icon: ICONS.users, role: [Role.Admin] },
    { id: 'machines', label: 'Quản lý Máy', icon: ICONS.machines, role: [Role.Admin] },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-surface flex flex-col">
        <div className="h-16 flex items-center justify-center text-xl font-bold text-text-primary border-b border-secondary">
          CNC Reporting
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navItems.filter(item => item.role.includes(user.role)).map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => { e.preventDefault(); handleNavClick(item.id); }}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === item.id 
                ? 'bg-accent text-white' 
                : 'text-text-secondary hover:bg-secondary hover:text-white'
              }`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-secondary">
            <button onClick={onLogout} className="flex items-center w-full px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-secondary hover:text-white transition-colors">
                {ICONS.logout}
                <span className="ml-3">Đăng xuất</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {activeView === 'dashboard' && <DashboardView user={user} />}
        {activeView === 'production' && <ProductionReportView user={user} />}
        {activeView === 'downtime' && <DowntimeReportView />}
        {activeView === 'history' && <HistoryView user={user} />}
        {activeView === 'users' && user.role === Role.Admin && <UserManagementView />}
        {activeView === 'machines' && user.role === Role.Admin && <MachineManagementView />}
      </main>
    </div>
  );
};

export default MainApp;