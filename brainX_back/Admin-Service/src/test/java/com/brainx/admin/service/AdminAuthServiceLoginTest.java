package com.brainx.admin.service;

import com.brainx.admin.dto.AdminDtos.AdminLoginData;
import com.brainx.admin.dto.AdminDtos.AdminLoginRequest;
import com.brainx.admin.entity.AdminAccount;
import com.brainx.admin.entity.AdminOperationEvent;
import com.brainx.admin.entity.AdminRole;
import com.brainx.admin.repository.AdminAccountRepository;
import com.brainx.admin.repository.AdminOperationEventRepository;
import com.brainx.admin.security.AdminJwtTokenProvider;
import com.brainx.admin.security.StrongPasswordGenerator;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAuthServiceLoginTest {

    @Mock
    private AdminAccountRepository adminAccountRepository;

    @Mock
    private AdminOperationEventRepository operationEvents;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AdminJwtTokenProvider jwtTokenProvider;

    @Mock
    private StrongPasswordGenerator passwordGenerator;

    private AdminAuthService adminAuthService;

    @BeforeEach
    void setUp() {
        adminAuthService = new AdminAuthService(
                adminAccountRepository,
                operationEvents,
                passwordEncoder,
                jwtTokenProvider,
                passwordGenerator
        );
    }

    @Test
    void loginSucceedsEvenWhenAuditLogInsertFails() {
        AdminAccount admin = new AdminAccount(
                "admin",
                "BrainX Admin",
                "owner@example.com",
                "$2a$10$abcdefghijklmnopqrstuv",
                AdminRole.owner,
                false
        );

        when(adminAccountRepository.findByLoginId("admin")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("BrainXAdmin!2026", admin.getPasswordHash())).thenReturn(true);
        when(adminAccountRepository.save(any(AdminAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doThrow(new RuntimeException("audit table unavailable")).when(operationEvents).save(any(AdminOperationEvent.class));
        when(jwtTokenProvider.createAccessToken(admin)).thenReturn("test-token");

        AdminLoginData result = adminAuthService.login(new AdminLoginRequest("admin", "BrainXAdmin!2026"));

        Assertions.assertThat(result.accessToken()).isEqualTo("test-token");
        Assertions.assertThat(result.admin().adminUserId()).isEqualTo(admin.getAdminId());
    }
}
