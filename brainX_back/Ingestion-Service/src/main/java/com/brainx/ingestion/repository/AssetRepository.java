package com.brainx.ingestion.repository;

import com.brainx.ingestion.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AssetRepository extends JpaRepository<Asset, String> {
    Optional<Asset> findByAssetIdAndUserId(String assetId, String userId);
}
