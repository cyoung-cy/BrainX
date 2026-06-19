package com.brainx.commerce.service;

import java.util.UUID;

final class Ids {
    private Ids() {
    }

    static String checkoutSession() {
        return "chk_" + UUID.randomUUID();
    }

    static String subscription() {
        return "sub_" + UUID.randomUUID();
    }

    static String payment() {
        return "pay_" + UUID.randomUUID();
    }
}
