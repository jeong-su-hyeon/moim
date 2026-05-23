package com.moim.domain.user.repository;

import com.moim.domain.user.entity.OAuthProvider;
import com.moim.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByProviderAndProviderId(OAuthProvider provider, String providerId);
    boolean existsByEmail(String email);
}
