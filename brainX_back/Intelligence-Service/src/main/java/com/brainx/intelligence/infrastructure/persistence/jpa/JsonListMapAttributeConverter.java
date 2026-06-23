package com.brainx.intelligence.infrastructure.persistence.jpa;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class JsonListMapAttributeConverter implements AttributeConverter<List<Map<String, Object>>, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<Map<String, Object>>> LIST_MAP_TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<Map<String, Object>> attribute) {
        try {
            List<Map<String, Object>> values = attribute == null ? List.of() : attribute;
            return OBJECT_MAPPER.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to serialize list map attribute.", exception);
        }
    }

    @Override
    public List<Map<String, Object>> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return List.of();
        }
        try {
            return OBJECT_MAPPER.readValue(dbData, LIST_MAP_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to deserialize list map attribute.", exception);
        }
    }
}
