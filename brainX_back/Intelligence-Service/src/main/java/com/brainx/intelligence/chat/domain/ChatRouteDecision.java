package com.brainx.intelligence.chat.domain;

public record ChatRouteDecision(
    ChatRoute route,
    String reason,
    String routerModel
) {

    public ChatRouteDecision {
        route = route == null ? ChatRoute.OUT_OF_SCOPE : route;
        reason = reason == null ? "" : reason.trim();
        routerModel = routerModel == null ? "" : routerModel.trim();
    }

    public static ChatRouteDecision outOfScope(String reason, String routerModel) {
        return new ChatRouteDecision(ChatRoute.OUT_OF_SCOPE, reason, routerModel);
    }
}
