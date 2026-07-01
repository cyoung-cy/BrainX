package com.brainx.workspace.security;

import com.brainx.workspace.exception.WorkspaceException;
import com.brainx.workspace.security.CurrentActor.Actor;
import com.brainx.workspace.security.CurrentActor.ActorType;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CurrentActorTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void userIdHeaderTakesPriorityOverEverythingElse() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader(CurrentActor.USER_ID_HEADER)).thenReturn("usr_123");
        when(request.getHeader(CurrentActor.GUEST_ID_HEADER)).thenReturn("gst_abc");
        CurrentActor currentActor = new CurrentActor(request);

        Actor actor = currentActor.actor();

        assertThat(actor).isEqualTo(new Actor(ActorType.USER, "usr_123"));
    }

    @Test
    void guestIdHeaderIsUsedWhenUserIdHeaderIsMissing() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader(CurrentActor.GUEST_ID_HEADER)).thenReturn("gst_abc");
        CurrentActor currentActor = new CurrentActor(request);

        Actor actor = currentActor.actor();

        assertThat(actor).isEqualTo(new Actor(ActorType.GUEST, "gst_abc"));
    }

    @Test
    void authenticatedJwtPrincipalIsUsedWhenNoHeadersArePresent() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        CurrentActor currentActor = new CurrentActor(request);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser("usr_jwt"), null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Actor actor = currentActor.actor();

        assertThat(actor).isEqualTo(new Actor(ActorType.USER, "usr_jwt"));
    }

    @Test
    void identificationFailsWhenNoHeaderOrAuthenticationIsPresentAndDevFallbackIsDisabled() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        CurrentActor currentActor = new CurrentActor(request);
        ReflectionTestUtils.setField(currentActor, "devFallbackEnabled", false);

        assertThatThrownBy(currentActor::actor)
                .isInstanceOfSatisfying(WorkspaceException.class, exception -> {
                    assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(exception.getCode()).isEqualTo("ACTOR_IDENTIFICATION_FAILED");
                });
    }

    @Test
    void devTestUserFallbackOnlyAppliesWhenExplicitlyEnabled() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        CurrentActor currentActor = new CurrentActor(request);
        ReflectionTestUtils.setField(currentActor, "devFallbackEnabled", true);

        Actor actor = currentActor.actor();

        assertThat(actor).isEqualTo(new Actor(ActorType.USER, "dev-test-user"));
    }
}
