protocol SomeType {}
public protocol SomeType {}

protocol SomeType {
    var property: String
}

protocol SomeType {
    var property: String { get }
}

protocol SomeType {
    var property: String { get set }
}

protocol SomeType {
    func foo()
}

protocol SomeType {
    associatedtype E
}

internal protocol SomeType {
    associatedtype E
    func foo()
    func bar()
    var property: String { get set }
}

protocol ClassishType: class {

}
