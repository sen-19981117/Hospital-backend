require('dotenv').config();
const { db, loadData, saveData } = require('../config/database');
const bcrypt = require('bcryptjs');

// 初始化数据库表和数据
const initDatabase = async () => {
  try {
    console.log('开始初始化数据库...\n');

    // 加载现有数据
    const data = loadData();

    // 清空现有数据（重新初始化）
    data.users = [];
    data.roles = [];
    data.menus = [];
    data.role_menus = [];
    data.departments = [];
    data.doctors = [];
    data.schedules = [];
    data.patients = [];
    data.orders = [];

    // 1. 初始化角色
    const roles = [
      { id: 1, role_name: '超级管理员', role_key: 'admin', remark: '所有权限', status: 1, create_time: new Date().toISOString() },
      { id: 2, role_name: '科室管理员', role_key: 'manager', remark: '科室/医生/排班/号源管理', status: 1, create_time: new Date().toISOString() },
      { id: 3, role_name: '挂号窗口/护士', role_key: 'nurse', remark: '挂号订单、患者信息', status: 1, create_time: new Date().toISOString() },
      { id: 4, role_name: '医生', role_key: 'doctor', remark: '查看排班、查看挂号记录', status: 1, create_time: new Date().toISOString() }
    ];
    data.roles = roles;
    console.log('✓ 角色数据初始化完成');

    // 2. 初始化管理员用户
    const hashedPassword = bcrypt.hashSync('123456', 10);
    data.users = [
      {
        id: 1,
        username: 'admin',
        password: hashedPassword,
        nickname: '系统管理员',
        phone: '13800138000',
        avatar: null,
        role_id: 1,
        status: 1,
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString()
      }
    ];
    console.log('✓ 管理员账号初始化完成 (admin/123456)');

    // 3. 初始化菜单
    const menus = [
      // 首页
      { id: 1, menu_name: '首页', path: '/dashboard', component: 'dashboard/index', icon: 'HomeFilled', parent_id: 0, sort: 1, menu_type: 2, permission: 'dashboard:view', status: 1, create_time: new Date().toISOString() },
      
      // 系统管理
      { id: 10, menu_name: '系统管理', path: '/system', component: null, icon: 'Setting', parent_id: 0, sort: 10, menu_type: 1, permission: null, status: 1, create_time: new Date().toISOString() },
      { id: 11, menu_name: '用户管理', path: 'user', component: 'system/user/index', icon: 'User', parent_id: 10, sort: 1, menu_type: 2, permission: 'user:view', status: 1, create_time: new Date().toISOString() },
      { id: 12, menu_name: '用户新增', path: '', component: '', icon: '', parent_id: 11, sort: 1, menu_type: 3, permission: 'user:add', status: 1, create_time: new Date().toISOString() },
      { id: 13, menu_name: '用户编辑', path: '', component: '', icon: '', parent_id: 11, sort: 2, menu_type: 3, permission: 'user:edit', status: 1, create_time: new Date().toISOString() },
      { id: 14, menu_name: '用户删除', path: '', component: '', icon: '', parent_id: 11, sort: 3, menu_type: 3, permission: 'user:delete', status: 1, create_time: new Date().toISOString() },
      
      { id: 20, menu_name: '角色管理', path: 'role', component: 'system/role/index', icon: 'UserFilled', parent_id: 10, sort: 2, menu_type: 2, permission: 'role:view', status: 1, create_time: new Date().toISOString() },
      { id: 21, menu_name: '角色新增', path: '', component: '', icon: '', parent_id: 20, sort: 1, menu_type: 3, permission: 'role:add', status: 1, create_time: new Date().toISOString() },
      { id: 22, menu_name: '角色编辑', path: '', component: '', icon: '', parent_id: 20, sort: 2, menu_type: 3, permission: 'role:edit', status: 1, create_time: new Date().toISOString() },
      { id: 23, menu_name: '角色删除', path: '', component: '', icon: '', parent_id: 20, sort: 3, menu_type: 3, permission: 'role:delete', status: 1, create_time: new Date().toISOString() },
      
      { id: 30, menu_name: '菜单管理', path: 'menu', component: 'system/menu/index', icon: 'Menu', parent_id: 10, sort: 3, menu_type: 2, permission: 'menu:view', status: 1, create_time: new Date().toISOString() },
      { id: 31, menu_name: '菜单新增', path: '', component: '', icon: '', parent_id: 30, sort: 1, menu_type: 3, permission: 'menu:add', status: 1, create_time: new Date().toISOString() },
      { id: 32, menu_name: '菜单编辑', path: '', component: '', icon: '', parent_id: 30, sort: 2, menu_type: 3, permission: 'menu:edit', status: 1, create_time: new Date().toISOString() },
      { id: 33, menu_name: '菜单删除', path: '', component: '', icon: '', parent_id: 30, sort: 3, menu_type: 3, permission: 'menu:delete', status: 1, create_time: new Date().toISOString() },
      
      // 医院管理
      { id: 40, menu_name: '医院管理', path: '/hospital', component: null, icon: 'OfficeBuilding', parent_id: 0, sort: 20, menu_type: 1, permission: null, status: 1, create_time: new Date().toISOString() },
      { id: 41, menu_name: '科室管理', path: 'department', component: 'hospital/department/index', icon: 'FirstAidKit', parent_id: 40, sort: 1, menu_type: 2, permission: 'dept:view', status: 1, create_time: new Date().toISOString() },
      { id: 42, menu_name: '科室新增', path: '', component: '', icon: '', parent_id: 41, sort: 1, menu_type: 3, permission: 'dept:add', status: 1, create_time: new Date().toISOString() },
      { id: 43, menu_name: '科室编辑', path: '', component: '', icon: '', parent_id: 41, sort: 2, menu_type: 3, permission: 'dept:edit', status: 1, create_time: new Date().toISOString() },
      { id: 44, menu_name: '科室删除', path: '', component: '', icon: '', parent_id: 41, sort: 3, menu_type: 3, permission: 'dept:delete', status: 1, create_time: new Date().toISOString() },
      
      { id: 50, menu_name: '医生管理', path: 'doctor', component: 'hospital/doctor/index', icon: 'Avatar', parent_id: 40, sort: 2, menu_type: 2, permission: 'doctor:view', status: 1, create_time: new Date().toISOString() },
      { id: 51, menu_name: '医生新增', path: '', component: '', icon: '', parent_id: 50, sort: 1, menu_type: 3, permission: 'doctor:add', status: 1, create_time: new Date().toISOString() },
      { id: 52, menu_name: '医生编辑', path: '', component: '', icon: '', parent_id: 50, sort: 2, menu_type: 3, permission: 'doctor:edit', status: 1, create_time: new Date().toISOString() },
      { id: 53, menu_name: '医生删除', path: '', component: '', icon: '', parent_id: 50, sort: 3, menu_type: 3, permission: 'doctor:delete', status: 1, create_time: new Date().toISOString() },
      
      { id: 60, menu_name: '排班管理', path: 'schedule', component: 'hospital/schedule/index', icon: 'Calendar', parent_id: 40, sort: 3, menu_type: 2, permission: 'schedule:view', status: 1, create_time: new Date().toISOString() },
      { id: 61, menu_name: '排班新增', path: '', component: '', icon: '', parent_id: 60, sort: 1, menu_type: 3, permission: 'schedule:add', status: 1, create_time: new Date().toISOString() },
      { id: 62, menu_name: '排班编辑', path: '', component: '', icon: '', parent_id: 60, sort: 2, menu_type: 3, permission: 'schedule:edit', status: 1, create_time: new Date().toISOString() },
      { id: 63, menu_name: '排班删除', path: '', component: '', icon: '', parent_id: 60, sort: 3, menu_type: 3, permission: 'schedule:delete', status: 1, create_time: new Date().toISOString() },
      
      { id: 70, menu_name: '号源管理', path: 'slot', component: 'hospital/slot/index', icon: 'Tickets', parent_id: 40, sort: 4, menu_type: 2, permission: 'slot:view', status: 1, create_time: new Date().toISOString() },
      
      // 患者管理
      { id: 80, menu_name: '患者管理', path: '/patient', component: null, icon: 'User', parent_id: 0, sort: 30, menu_type: 1, permission: null, status: 1, create_time: new Date().toISOString() },
      { id: 81, menu_name: '患者列表', path: 'list', component: 'patient/index', icon: 'Document', parent_id: 80, sort: 1, menu_type: 2, permission: 'patient:view', status: 1, create_time: new Date().toISOString() },
      { id: 82, menu_name: '患者新增', path: '', component: '', icon: '', parent_id: 81, sort: 1, menu_type: 3, permission: 'patient:add', status: 1, create_time: new Date().toISOString() },
      { id: 83, menu_name: '患者编辑', path: '', component: '', icon: '', parent_id: 81, sort: 2, menu_type: 3, permission: 'patient:edit', status: 1, create_time: new Date().toISOString() },
      { id: 84, menu_name: '患者删除', path: '', component: '', icon: '', parent_id: 81, sort: 3, menu_type: 3, permission: 'patient:delete', status: 1, create_time: new Date().toISOString() },
      
      // 挂号订单
      { id: 90, menu_name: '挂号订单', path: '/order', component: null, icon: 'DocumentChecked', parent_id: 0, sort: 40, menu_type: 1, permission: null, status: 1, create_time: new Date().toISOString() },
      { id: 91, menu_name: '挂号订单列表', path: 'list', component: 'order/index', icon: 'List', parent_id: 90, sort: 1, menu_type: 2, permission: 'order:view', status: 1, create_time: new Date().toISOString() },
      { id: 92, menu_name: '订单新增', path: '', component: '', icon: '', parent_id: 91, sort: 1, menu_type: 3, permission: 'order:add', status: 1, create_time: new Date().toISOString() },
      { id: 93, menu_name: '订单支付', path: '', component: '', icon: '', parent_id: 91, sort: 2, menu_type: 3, permission: 'order:pay', status: 1, create_time: new Date().toISOString() },
      { id: 94, menu_name: '订单取消', path: '', component: '', icon: '', parent_id: 91, sort: 3, menu_type: 3, permission: 'order:cancel', status: 1, create_time: new Date().toISOString() },
      { id: 95, menu_name: '订单退号', path: '', component: '', icon: '', parent_id: 91, sort: 4, menu_type: 3, permission: 'order:refund', status: 1, create_time: new Date().toISOString() },
      { id: 96, menu_name: '订单完成', path: '', component: '', icon: '', parent_id: 91, sort: 5, menu_type: 3, permission: 'order:complete', status: 1, create_time: new Date().toISOString() },
      
      // 数据分析
      { id: 100, menu_name: '数据分析', path: '/statistics', component: null, icon: 'TrendCharts', parent_id: 0, sort: 50, menu_type: 1, permission: null, status: 1, create_time: new Date().toISOString() },
      { id: 101, menu_name: '数据大盘', path: 'dashboard', component: 'statistics/index', icon: 'PieChart', parent_id: 100, sort: 1, menu_type: 2, permission: 'statistics:view', status: 1, create_time: new Date().toISOString() }
    ];
    data.menus = menus;
    console.log('✓ 菜单数据初始化完成');

    // 4. 为管理员角色分配所有菜单权限
    data.role_menus = menus.map(menu => ({
      id: menu.id,
      role_id: 1,
      menu_id: menu.id
    }));
    console.log('✓ 管理员角色菜单权限初始化完成');

    // 5. 初始化示例科室
    data.departments = [
      { id: 1, name: '内科', description: '心血管、呼吸系统疾病', floor: '门诊楼2层', status: 1, create_time: new Date().toISOString() },
      { id: 2, name: '外科', description: '普外、骨科、泌尿外科', floor: '门诊楼3层', status: 1, create_time: new Date().toISOString() },
      { id: 3, name: '妇产科', description: '妇科、产科', floor: '门诊楼4层', status: 1, create_time: new Date().toISOString() },
      { id: 4, name: '儿科', description: '儿童常见病、新生儿科', floor: '门诊楼1层', status: 1, create_time: new Date().toISOString() },
      { id: 5, name: '眼科', description: '眼科疾病、视力检查', floor: '门诊楼5层', status: 1, create_time: new Date().toISOString() }
    ];
    console.log('✓ 科室数据初始化完成');

    // 6. 初始化示例医生
    data.doctors = [
      { id: 1, name: '张医生', gender: '男', phone: '13800138001', department_id: 1, title: '主任医师', skill: '心血管疾病诊治', avatar: null, status: 1, create_time: new Date().toISOString() },
      { id: 2, name: '李医生', gender: '女', phone: '13800138002', department_id: 1, title: '副主任医师', skill: '呼吸系统疾病', avatar: null, status: 1, create_time: new Date().toISOString() },
      { id: 3, name: '王医生', gender: '男', phone: '13800138003', department_id: 2, title: '主任医师', skill: '肝胆外科', avatar: null, status: 1, create_time: new Date().toISOString() },
      { id: 4, name: '刘医生', gender: '女', phone: '13800138004', department_id: 3, title: '副主任医师', skill: '产科', avatar: null, status: 1, create_time: new Date().toISOString() },
      { id: 5, name: '陈医生', gender: '男', phone: '13800138005', department_id: 4, title: '主任医师', skill: '儿科常见病', avatar: null, status: 1, create_time: new Date().toISOString() }
    ];
    console.log('✓ 医生数据初始化完成');

    // 7. 初始化示例排班（生成未来7天的排班）
    data.schedules = [];
    const timeRanges = ['AM', 'PM'];
    const prices = { AM: 15, PM: 15, NIGHT: 20 };
    let scheduleId = 1;

    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      // 为每个医生生成排班
      data.doctors.forEach(doctor => {
        timeRanges.forEach(timeRange => {
          data.schedules.push({
            id: scheduleId++,
            doctor_id: doctor.id,
            department_id: doctor.department_id,
            date: dateStr,
            time_range: timeRange,
            total_count: 20,
            remain_count: 20,
            price: prices[timeRange],
            status: 1,
            create_time: new Date().toISOString()
          });
        });
      });
    }
    console.log(`✓ 排班数据初始化完成（${data.schedules.length}条）`);

    // 8. 初始化示例患者
    data.patients = [
      { id: 1, name: '王小明', gender: '男', phone: '13812345678', id_card: '110101199001011234', address: '北京市海淀区', birth_date: '1990-01-01', create_time: new Date().toISOString() },
      { id: 2, name: '李小红', gender: '女', phone: '13812345679', id_card: '110101199002021235', address: '北京市朝阳区', birth_date: '1990-02-02', create_time: new Date().toISOString() },
      { id: 3, name: '张大伟', gender: '男', phone: '13812345680', id_card: '110101198503031236', address: '北京市东城区', birth_date: '1985-03-03', create_time: new Date().toISOString() }
    ];
    console.log('✓ 患者数据初始化完成');

    // 保存数据
    saveData();

    console.log('\n✅ 数据库初始化完成！');
    console.log('默认管理员账号: admin / 123456');
    console.log('\n可以启动服务了: npm run dev');

  } catch (err) {
    console.error('初始化失败:', err);
    process.exit(1);
  }
};

// 执行初始化
initDatabase();
