package brain.web.mvc.controller;

import brain.web.mvc.entity.User;
import brain.web.mvc.entity.UserStatus;
import brain.web.mvc.repository.UserRepository;
import brain.web.mvc.service.UserLoginSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/v1/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserRepository userRepository;
    private final UserLoginSessionService userLoginSessionService;

    @GetMapping
    public ResponseEntity<List<UserDto>> listUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) Integer joinedYear
    ) {
        List<User> users = userRepository.findUsersInternal(q, status, joinedYear);
        List<UserDto> dtos = users.stream()
                .map(user -> UserDto.from(user, userLoginSessionService.latestSession(user.getUserId())))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserDetail(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return ResponseEntity.ok(UserDto.from(user, userLoginSessionService.latestSession(userId)));
    }

    @GetMapping("/{userId}/login-sessions")
    public ResponseEntity<List<LoginSessionDto>> getLoginSessions(@PathVariable String userId) {
        List<LoginSessionDto> sessions = userLoginSessionService.listSessions(userId).stream()
                .map(LoginSessionDto::from)
                .toList();
        return ResponseEntity.ok(sessions);
    }

    @PatchMapping("/{userId}/status")
    @Transactional
    public ResponseEntity<UserDto> changeStatus(
            @PathVariable String userId,
            @RequestBody Map<String, String> body
    ) {
        UserStatus newStatus = UserStatus.valueOf(body.get("status"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.changeStatus(newStatus);
        return ResponseEntity.ok(UserDto.from(user, userLoginSessionService.latestSession(userId)));
    }

    @PostMapping("/{userId}/withdrawal")
    @Transactional
    public ResponseEntity<UserDto> withdrawUser(
            @PathVariable String userId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : "Admin requested withdrawal";
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.requestDeletion(reason, LocalDateTime.now().plusDays(30));
        return ResponseEntity.ok(UserDto.from(user, userLoginSessionService.latestSession(userId)));
    }

    @PostMapping("/bulk-actions")
    @Transactional
    public ResponseEntity<Map<String, Object>> runBulkAction(@RequestBody Map<String, Object> body) {
        List<String> userIds = (List<String>) body.get("userIds");
        String action = (String) body.get("action");
        int accepted = 0;
        int failed = 0;

        for (String userId : userIds) {
            try {
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    if ("SUSPEND".equals(action)) {
                        user.changeStatus(UserStatus.SUSPENDED);
                    } else if ("REACTIVATE".equals(action)) {
                        user.changeStatus(UserStatus.ACTIVE);
                    } else if ("WITHDRAW".equals(action)) {
                        user.requestDeletion("Admin Bulk Withdrawal", LocalDateTime.now().plusDays(30));
                    }
                    accepted++;
                } else {
                    failed++;
                }
            } catch (Exception e) {
                failed++;
            }
        }
        return ResponseEntity.ok(Map.of("accepted", accepted, "failed", failed, "jobId", "JOB-BULK-" + System.currentTimeMillis()));
    }

    public record UserDto(
            String userId,
            String email,
            String nickname,
            String role,
            UserStatus status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            LocalDateTime deletionScheduledAt,
            String deletionReason,
            String lastLoginSessionId,
            LocalDateTime lastLoginAt,
            String lastLoginDevice,
            String lastLoginLocation,
            String lastLoginIpAddress,
            String lastLoginUserAgentHash,
            Boolean lastLoginCurrent
    ) {
        public static UserDto from(User user, UserLoginSessionService.LoginSessionSnapshot lastLogin) {
            return new UserDto(
                    user.getUserId(),
                    user.getEmail(),
                    user.getNickname(),
                    user.getRole().name(),
                    user.getStatus(),
                    user.getCreatedAt(),
                    user.getUpdatedAt(),
                    user.getDeletionScheduledAt(),
                    user.getDeletionReason(),
                    lastLogin != null ? lastLogin.sessionId() : null,
                    lastLogin != null ? lastLogin.lastSeenAt() : null,
                    lastLogin != null ? lastLogin.device() : null,
                    lastLogin != null ? lastLogin.location() : null,
                    lastLogin != null ? lastLogin.ipAddress() : null,
                    lastLogin != null ? lastLogin.userAgentHash() : null,
                    lastLogin != null ? lastLogin.current() : null
            );
        }
    }

    public record LoginSessionDto(
            String sessionId,
            String device,
            String location,
            String ipAddress,
            String userAgentHash,
            LocalDateTime lastSeenAt,
            boolean current
    ) {
        public static LoginSessionDto from(UserLoginSessionService.LoginSessionSnapshot snapshot) {
            return new LoginSessionDto(
                    snapshot.sessionId(),
                    snapshot.device(),
                    snapshot.location(),
                    snapshot.ipAddress(),
                    snapshot.userAgentHash(),
                    snapshot.lastSeenAt(),
                    snapshot.current()
            );
        }
    }
}
