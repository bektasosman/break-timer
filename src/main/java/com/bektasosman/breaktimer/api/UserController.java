package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.repository.UserRepository;
import com.bektasosman.breaktimer.exception.UserNotFoundException;
import org.springframework.hateoas.EntityModel;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
public class UserController {

    private final UserRepository repository;


    public UserController(UserRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/breaktimer/users")
    List<User> allUser() {
        return repository.findAll();
    }

    @PostMapping("/breaktimer/users")
    User newUser(@RequestBody User user) {
        return repository.save(user);
    }

    @GetMapping("/breaktimer/users/{id}")
    EntityModel<User> one(@PathVariable Long id) {
        User user = repository.findById(id).orElseThrow(() -> new UserNotFoundException(id));

        return EntityModel.of(user,
                linkTo(methodOn(UserController.class).one(id)).withSelfRel(),
                linkTo(methodOn(UserController.class).allUser()).withRel("users"));
    }

    @PutMapping("/breaktimer/users/{id}")
    User replaceUser(@RequestBody User newUser, @PathVariable Long id) {
        return repository.findById(id)
                .map(user -> {
                    user.setName(newUser.getName());
                    user.setAge(newUser.getAge());
                    user.setHobby(newUser.getHobby());
                    return repository.save(user);
                })
                .orElseGet(() -> repository.save(newUser));
    }

    @DeleteMapping("/breaktimer/users/{id}")
    void deleteUser(@PathVariable Long id) {
        repository.deleteById(id);
    }

}
