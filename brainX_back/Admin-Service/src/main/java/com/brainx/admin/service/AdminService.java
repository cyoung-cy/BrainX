package com.brainx.admin.service;

import com.brainx.admin.dto.AdminDtos.*;
import com.brainx.admin.entity.AdminOperationEvent;
import com.brainx.admin.repository.AdminOperationEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminService {
    private static final OffsetDateTime BASE = OffsetDateTime.parse("2026-06-25T09:14:00+09:00");

    private final List<AdminUserRow> users = new ArrayList<>();
    private final List<SupportTicketData> tickets = new ArrayList<>();
    private final List<AdminPaymentRow> payments = new ArrayList<>();
    private final List<AdminSubscriptionRow> subscriptions = new ArrayList<>();
    private final List<AdminPaymentFailureRow> failures = new ArrayList<>();
    private final List<AdminPlanData> plans = new ArrayList<>();
    private final AdminOperationEventRepository operationEvents;

    public AdminService(AdminOperationEventRepository operationEvents) {
        this.operationEvents = operationEvents;
        seedUsers();
        seedSupport();
        seedBilling();
    }

    public AdminDashboardOverviewData dashboardOverview() {
        return new AdminDashboardOverviewData(
                List.of(
                        new KpiData("이번 달 매출", "₩184.2M", "+12.4%", "good", "Commerce-Service 집계"),
                        new KpiData("활성 구독", "1,026", "+3.1%", "good", "현재 유료 구독"),
                        new KpiData("MRR", "₩28.4M", "+18.4%", "good", "월 반복 매출"),
                        new KpiData("결제 실패", String.valueOf(failures.size()), "-0.3%", "bad", "재시도 필요")
                ),
                List.of(
                        new ServiceHealthData("User-Service", "42ms", "99.99%", "ok"),
                        new ServiceHealthData("Workspace-Service", "68ms", "99.97%", "ok"),
                        new ServiceHealthData("AI-Service", "1,240ms", "99.40%", "warn"),
                        new ServiceHealthData("Ingestion-Service", "96ms", "99.91%", "ok"),
                        new ServiceHealthData("Commerce-Service", "73ms", "99.95%", "ok")
                ),
                List.of(
                        new LogData("WARN", "AI-Service", "P95 latency exceeded threshold: 1.24s", "09:45:18"),
                        new LogData("ERROR", "Commerce-Service", "Payment confirm retry queued for PAY-8920", "09:43:02"),
                        new LogData("INFO", "Ingestion-Service", "Notion import job completed: 382 pages", "09:41:55")
                ),
                List.of(42, 48, 39, 56, 61, 58, 73, 66, 70, 78, 82, 76, 91, 98),
                List.of(420, 520, 490, 680, 730, 710, 920, 840, 960, 1120, 1180, 1090, 1240, 1284)
        );
    }

    public AdminUsersData listUsers(String q, PlanId planId, ManagedUserStatus status, Integer joinedYear, int page, int size) {
        List<AdminUserRow> filtered = users.stream()
                .filter(user -> q == null || q.isBlank() || (user.name() + " " + user.email()).toLowerCase().contains(q.toLowerCase()))
                .filter(user -> planId == null || user.planId() == planId)
                .filter(user -> status == null || user.status() == status)
                .filter(user -> joinedYear == null || user.joinedAt().getYear() == joinedYear)
                .toList();
        return new AdminUsersData(filtered, new PaginationData(page, size, filtered.size(), 1), filtered.size());
    }

    public AdminUserDetailData getUserDetail(String userId) {
        AdminUserRow user = findUser(userId);
        return new AdminUserDetailData(
                user.userId(), user.name(), user.email(), user.planId(), user.status(), user.noteCount(), user.storageBytes(),
                user.joinedAt(), user.lastActiveAt(), user.lastLogin(),
                List.of(user.lastLogin(), new AdminUserLoginSession(user.userId() + "-recent", "Chrome / Windows", "부산", "211.45.18.72", "mock-recent", BASE.minusDays(3), false)),
                user.activities()
        );
    }

    @Transactional
    public AdminUserPlanChangeData changeUserPlan(String userId, AdminUserPlanChangeRequest request) {
        recordOperation("USER_PLAN_CHANGE", "USER", userId, "targetPlanId=" + request.targetPlanId());
        return new AdminUserPlanChangeData(userId, request.targetPlanId(), OffsetDateTime.now());
    }

    @Transactional
    public AdminUserStatusChangeData changeUserStatus(String userId, AdminUserStatusChangeRequest request) {
        recordOperation("USER_STATUS_CHANGE", "USER", userId, "status=" + request.status());
        return new AdminUserStatusChangeData(userId, request.status(), OffsetDateTime.now());
    }

    @Transactional
    public AdminUserWithdrawalData withdrawUser(String userId) {
        recordOperation("USER_WITHDRAWAL_REQUEST", "USER", userId, null);
        return new AdminUserWithdrawalData(userId, "DEL-" + userId, "REQUESTED");
    }

    @Transactional
    public AdminUserBulkActionData runBulkAction(AdminUserBulkActionRequest request) {
        String jobId = "JOB-" + UUID.randomUUID();
        recordOperation("USER_BULK_" + request.action(), "USER_BULK", String.join(",", request.userIds()), "jobId=" + jobId);
        return new AdminUserBulkActionData(request.userIds().size(), 0, jobId);
    }

    public AdminMeData getMe() {
        return new AdminMeData("adm_001", "김운영", "admin@brainx.io", "Super Admin", List.of("최고관리자", "전체 접근 권한"), BASE.minusMinutes(43), OffsetDateTime.parse("2023-01-09T00:00:00+09:00"));
    }

    public AdminMeData updateProfile(AdminProfileUpdateRequest request) {
        AdminMeData current = getMe();
        return new AdminMeData(current.adminUserId(), valueOr(request.name(), current.name()), valueOr(request.email(), current.email()), current.role(), current.permissions(), current.lastLoginAt(), current.createdAt());
    }

    public AdminSupportTicketsData listTickets(SupportStatus status) {
        List<SupportTicketData> rows = tickets.stream().filter(ticket -> status == null || ticket.status() == status).toList();
        return new AdminSupportTicketsData(rows);
    }

    public AdminSupportTicketData getTicket(String ticketId) {
        return new AdminSupportTicketData(findTicket(ticketId));
    }

    @Transactional
    public AdminSupportTicketData updateTicket(String ticketId, AdminSupportTicketUpdateRequest request) {
        SupportTicketData ticket = findTicket(ticketId);
        recordOperation("SUPPORT_TICKET_UPDATE", "SUPPORT_TICKET", ticketId, "status=" + request.status());
        return new AdminSupportTicketData(new SupportTicketData(
                ticket.ticketId(), ticket.userId(), ticket.userName(), ticket.email(),
                request.status() != null ? request.status() : ticket.status(),
                ticket.category(), ticket.subject(), ticket.createdAt(),
                request.assigneeAdminUserId(), request.assigneeAdminUserId() == null ? null : "김운영",
                ticket.urgent(), ticket.body()
        ));
    }

    @Transactional
    public SupportReplyData replyTicket(String ticketId) {
        SupportReplyData reply = new SupportReplyData("RPL-" + UUID.randomUUID(), ticketId, "adm_001", OffsetDateTime.now());
        recordOperation("SUPPORT_TICKET_REPLY", "SUPPORT_TICKET", ticketId, "replyId=" + reply.replyId());
        return reply;
    }

    public AdminBillingSummaryData billingSummary() {
        return new AdminBillingSummaryData(new BigDecimal("184200000"), 1026, new BigDecimal("28400000"), failures.size());
    }

    public AdminPaymentsData listPayments(PaymentStatus status, PlanId planId, int page, int size) {
        List<AdminPaymentRow> rows = payments.stream()
                .filter(payment -> status == null || payment.status() == status)
                .filter(payment -> planId == null || payment.planId() == planId)
                .toList();
        return new AdminPaymentsData(rows, new PaginationData(page, size, rows.size(), 1));
    }

    @Transactional
    public AdminPaymentActionData refundPayment(String paymentId) {
        recordOperation("PAYMENT_REFUND_REQUEST", "PAYMENT", paymentId, null);
        return new AdminPaymentActionData(paymentId, "REFUND_REQUESTED", OffsetDateTime.now());
    }

    @Transactional
    public AdminPaymentActionData retryPayment(String paymentId) {
        recordOperation("PAYMENT_RETRY_REQUEST", "PAYMENT", paymentId, null);
        return new AdminPaymentActionData(paymentId, "RETRY_REQUESTED", OffsetDateTime.now());
    }

    public AdminSubscriptionsData listSubscriptions() {
        return new AdminSubscriptionsData(subscriptions);
    }

    public AdminPaymentFailuresData listPaymentFailures() {
        return new AdminPaymentFailuresData(failures);
    }

    public AdminPlansData listPlans() {
        return new AdminPlansData(plans);
    }

    @Transactional
    public AdminPlanData updatePlanPrice(PlanId planId, AdminPlanPriceUpdateRequest request) {
        AdminPlanData plan = plans.stream().filter(item -> item.planId() == planId).findFirst().orElse(new AdminPlanData(planId, planId.name(), BigDecimal.ZERO, "KRW", "", null));
        recordOperation("PLAN_PRICE_UPDATE", "PLAN", planId.name(), "price=" + request.price() + ", applyTiming=" + request.applyTiming());
        return new AdminPlanData(plan.planId(), plan.name(), request.price(), valueOr(request.currency(), "KRW"), plan.description(), OffsetDateTime.now());
    }

    public AdminTokenUsageData tokenUsage() {
        return new AdminTokenUsageData(List.of(Map.of("modelId", "gpt-4.1", "tokens", 1242000)), new BigDecimal("37.12"));
    }

    public AdminUserCreateData createAdminUser(AdminUserCreateRequest request) {
        return new AdminUserCreateData("adm_" + UUID.randomUUID());
    }

    private AdminUserRow findUser(String userId) {
        return users.stream().filter(user -> user.userId().equals(userId)).findFirst().orElseThrow();
    }

    private SupportTicketData findTicket(String ticketId) {
        return tickets.stream().filter(ticket -> ticket.ticketId().equals(ticketId)).findFirst().orElseThrow();
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private void recordOperation(String action, String targetType, String targetId, String detail) {
        operationEvents.save(new AdminOperationEvent(action, targetType, targetId, "adm_001", detail));
    }

    private void seedUsers() {
        addUser("USR-1001", "김서연", "seoyeon.kim@gmail.com", PlanId.team, ManagedUserStatus.ACTIVE, 842, "2024-03-12T09:00:00+09:00", "Chrome / macOS", "서울");
        addUser("USR-1002", "이준호", "junho.lee@naver.com", PlanId.pro, ManagedUserStatus.ACTIVE, 317, "2024-07-29T09:00:00+09:00", "Edge / Windows", "부산");
        addUser("USR-1003", "박지민", "jimin.park@kakao.com", PlanId.free, ManagedUserStatus.ACTIVE, 48, "2025-01-04T09:00:00+09:00", "Safari / iOS", "대전");
        addUser("USR-1004", "최예린", "yerin.choi@gmail.com", PlanId.pro, ManagedUserStatus.SUSPENDED, 521, "2023-11-20T09:00:00+09:00", "Chrome / Windows", "인천");
        addUser("USR-1005", "정우진", "woojin.jung@outlook.com", PlanId.free, ManagedUserStatus.ACTIVE, 12, "2025-05-18T09:00:00+09:00", "Chrome / Android", "서울");
        addUser("USR-1006", "한소희", "sohee.han@gmail.com", PlanId.team, ManagedUserStatus.ACTIVE, 1204, "2023-06-02T09:00:00+09:00", "Chrome / macOS", "서울");
    }

    private void addUser(String id, String name, String email, PlanId plan, ManagedUserStatus status, int notes, String joinedAt, String device, String location) {
        AdminUserLoginSession session = new AdminUserLoginSession(id + "-session-current", device, location, "121.168.32.104", "mock-user-agent-hash", BASE.minusMinutes(5), status == ManagedUserStatus.ACTIVE);
        users.add(new AdminUserRow(id, name, email, plan, status, notes, notes * 1024L * 1024L * 10L, OffsetDateTime.parse(joinedAt), BASE.minusMinutes(5), session, List.of(
                new AdminUserActivity(id + "-a1", "USER_ACTIVITY", "노트 12개 생성 · 워크스페이스 리서치", BASE.minusMinutes(5)),
                new AdminUserActivity(id + "-a2", "USER_ACTIVITY", "AI 요약 실행 x3, AI 대화 x8", BASE.minusHours(1))
        )));
    }

    private void seedSupport() {
        tickets.add(new SupportTicketData("TKT-7218", "USR-1001", "김서연", "seoyeon.kim@gmail.com", SupportStatus.IN_PROGRESS, "버그", "AI 요약이 일부 노트에서 생성되지 않습니다", BASE.minusMinutes(0), null, null, true, "Team 플랜을 사용 중인데 AI 요약 결과가 나오지 않습니다."));
        tickets.add(new SupportTicketData("TKT-7217", "USR-1005", "정우진", "woojin.jung@outlook.com", SupportStatus.OPEN, "문의", "무료 플랜에서 노트 개수 제한이 궁금합니다", BASE.minusMinutes(23), null, null, false, "무료 플랜 제한을 알고 싶습니다."));
        tickets.add(new SupportTicketData("TKT-7216", "USR-1009", "임도현", "dohyun.lim@kakao.com", SupportStatus.IN_PROGRESS, "결제", "결제는 됐는데 Pro 기능이 활성화되지 않아요", BASE.minusDays(1), "adm_001", "김운영", true, "Pro 플랜 결제 후에도 무료로 표시됩니다."));
    }

    private void seedBilling() {
        plans.add(new AdminPlanData(PlanId.free, "무료", BigDecimal.ZERO, "KRW", "노트 100개 · 기본 AI 요약", null));
        plans.add(new AdminPlanData(PlanId.pro, "Pro", new BigDecimal("19000"), "KRW", "무제한 노트 · 고급 AI · 대화", null));
        plans.add(new AdminPlanData(PlanId.team, "Team", new BigDecimal("39000"), "KRW", "협업 · 권한 관리 · 우선 지원", null));

        payments.add(new AdminPaymentRow("TXN-8F2A91", "TXN-8F2A91", "USR-1006", "한소희", PlanId.team, new BigDecimal("39000"), "KRW", "신한카드", PaymentStatus.SUCCESS, BASE.minusMinutes(32)));
        payments.add(new AdminPaymentRow("TXN-7B14C2", "TXN-7B14C2", "USR-1002", "이준호", PlanId.pro, new BigDecimal("19000"), "KRW", "카카오페이", PaymentStatus.SUCCESS, BASE.minusHours(2)));
        payments.add(new AdminPaymentRow("TXN-3D90E5", "TXN-3D90E5", "USR-1009", "임도현", PlanId.pro, new BigDecimal("19000"), "KRW", "국민카드", PaymentStatus.FAILED, BASE.minusHours(7)));

        subscriptions.add(new AdminSubscriptionRow("SUB-USR-1001", "USR-1001", "김서연", "김", PlanId.team, OffsetDateTime.parse("2024-03-12T09:00:00+09:00"), OffsetDateTime.parse("2026-07-12T09:00:00+09:00"), new BigDecimal("39000"), "KRW"));
        subscriptions.add(new AdminSubscriptionRow("SUB-USR-1002", "USR-1002", "이준호", "이", PlanId.pro, OffsetDateTime.parse("2024-07-29T09:00:00+09:00"), OffsetDateTime.parse("2026-07-29T09:00:00+09:00"), new BigDecimal("19000"), "KRW"));

        failures.add(new AdminPaymentFailureRow("TXN-3D90E5", "USR-1009", "임도현", PlanId.pro, new BigDecimal("19000"), "KRW", "카드 한도 초과", 2, BASE.minusHours(7)));
        failures.add(new AdminPaymentFailureRow("TXN-2F48D7", "USR-2001", "강민서", PlanId.team, new BigDecimal("39000"), "KRW", "유효기간 만료", 1, BASE.minusDays(1)));
    }
}
