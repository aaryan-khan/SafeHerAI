package com.safeherai.backend.admin;

import com.safeherai.backend.user.UserRepository;
import com.safeherai.backend.user.UserResponse;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only endpoints. Access is enforced in SecurityConfig: /api/v1/admin/** requires ROLE_ADMIN. */
@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final UserRepository users;

    public AdminUserController(UserRepository users) {
        this.users = users;
    }

    public record UserPage(List<UserResponse> items, int page, int size, long totalItems) {
    }

    @GetMapping
    @Transactional(readOnly = true)
    public UserPage list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserResponse> result = users.findAll(request).map(UserResponse::from);
        return new UserPage(result.getContent(), result.getNumber(), result.getSize(), result.getTotalElements());
    }
}